import * as React from 'react';
import jsLogger from 'js-logger';
import {
    forOwn,
} from "lodash";
// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';

import { VisGeometry, DevGUI } from "../agentsim";

interface AgentSimController {
    // NOTE: these can be typed in the future, but they may change signifantly and I dont want to at the moment. -MMRM
    simParameters: any;
    visData: any;
    netConnection: any;
}

interface ViewportProps {
    height: number;
    width: number;
    devgui: boolean;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void;
    agentSimController: AgentSimController;
    onJsonDataArrived: any;
    onTrajectoryFileInfoChanged: (cachedData: any) => void;
    highlightedParticleType: number | string;
    loadIntialData: boolean;
}

interface TimeData {
    time: number;
    frameNumber: number;
}


class Viewport extends React.Component<ViewportProps> {
    // NOTE: this can be typed in the future, but they may change signifantly and I dont want to at the moment. -MMRM
    private visGeometry: any;
    private lastRenderTime: number;
    private vdomRef: React.RefObject<HTMLInputElement>;
    private handlers: { [key: string]: (e: any) => void };

    private hit: boolean;
    private raycaster: THREE.Raycaster;
    private animationRequestID: number;

    public static defaultProps = {
        height: 800,
        width: 800,
        devgui: false,
        highlightedParticleType: -1,
        loadIntialData: true,
    };

    private static isCustomEvent(event: Event): event is CustomEvent {
        return 'detail' in event;
    }


    public constructor(props: ViewportProps) {
        super(props);

        const loggerLevel = props.loggerLevel === 'debug' ? jsLogger.DEBUG : jsLogger.OFF;
        const {
            agentSimController,
        } = this.props;

        this.visGeometry = new VisGeometry(loggerLevel);
        this.animate = this.animate.bind(this);
        this.visGeometry.setupScene();
        this.visGeometry.createMaterials(agentSimController.visData.colors);
        this.visGeometry.createMeshes(5000);
        this.vdomRef = React.createRef();
        this.dispatchUpdatedTime = this.dispatchUpdatedTime.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.lastRenderTime = Date.now();
        this.onPickObject = this.onPickObject.bind(this);

        this.handlers = {
            contextmenu: this.onPickObject
        };
        this.hit = false;
        this.raycaster = new THREE.Raycaster();
        this.animationRequestID = 0;
    }

    public componentDidMount() {
        const {
            agentSimController,
            onTrajectoryFileInfoChanged,
            loadIntialData,
        } = this.props;
        const {
            simParameters,
        } = agentSimController;
        this.visGeometry.reparent(this.vdomRef.current);
        agentSimController.connect().then(() => {
                if (loadIntialData) {
                    agentSimController.initializeTrajectoryFile();
                }
        });

        simParameters.handleTrajectoryData = onTrajectoryFileInfoChanged;
        setInterval(agentSimController.netConnection.checkForUpdates.bind(agentSimController.netConnection), 1000);

        if (this.vdomRef.current) {
            this.vdomRef.current.addEventListener('timeChange', this.handleTimeChange, false);
        }
        this.addEventHandlersToCanvas();

        this.animate();
    }

    public componentWillUnmount() {
        if (this.vdomRef.current) {
            this.vdomRef.current.removeEventListener('timeChange', this.handleTimeChange);
        }
        this.removeEventHandlersFromCanvas();
        this.stopAnimate();

    }

    public componentDidUpdate(prevProps: ViewportProps) {
        const { height, width } = this.props;
        this.visGeometry.setHighlightById(this.props.highlightedParticleType);
        if (prevProps.height !== height || prevProps.width !== width) {
            this.visGeometry.resize(width, height);
        }
    }

    public addEventHandlersToCanvas() {
        forOwn(this.handlers, (handler, eventName) =>
            this.visGeometry.renderDom.addEventListener(eventName, handler, false)
        );
    }

    public removeEventHandlersFromCanvas() {
        forOwn(this.handlers, (handler, eventName) =>
            this.visGeometry.renderDom.removeEventListener(eventName, handler, false)
        );
    }

    public onPickObject(event: MouseEvent) {
        const size = new THREE.Vector2();
        this.visGeometry.renderer.getSize(size);

        const mouse = {
            x: ((event.offsetX) / size.x) * 2 - 1,
            y: -((event.offsetY) / size.y) * 2 + 1
        };

        // hit testing
        this.raycaster.setFromCamera(mouse, this.visGeometry.camera);
        // TODO: intersect with scene's children not including lights?
        // can we select a smaller number of things to hit test?
        this.visGeometry.setFollowObject(null);
        const intersects = this.raycaster.intersectObjects(this.visGeometry.scene.children, true);
        if (intersects && intersects.length) {
            const obj = intersects[0].object;
            this.hit = true;
            this.visGeometry.setFollowObject(obj);
        } else if (this.hit) {
            this.hit = false;
        }
    }

    private handleTimeChange(e: Event) {
        const {
            onTimeChange,
        } = this.props;
        if (!Viewport.isCustomEvent(e)) {
            throw new Error('not custom event');
        }
        onTimeChange(e.detail)
    }

    private dispatchUpdatedTime(timeData) {
        const event = new CustomEvent('timeChange', { detail: timeData });
        if (this.vdomRef.current) {
            this.vdomRef.current.dispatchEvent(event);
        }
    }

    public stopAnimate() {
        if (this.animationRequestID !== 0) {
            cancelAnimationFrame(this.animationRequestID);
            this.animationRequestID = 0;
        }
    }

    public animate() {
        const {
            agentSimController,
            onJsonDataArrived,
        } = this.props;
        const {
            simParameters,
            netConnection,
            visData,
        } = agentSimController;
        const framesPerSecond = 60; // how often the view-port rendering is refreshed per second
        const timePerFrame = 1000 / framesPerSecond; // the time interval at which to re-render
        const elapsedTime = Date.now() - this.lastRenderTime;
        if (elapsedTime > timePerFrame) {
            if (!netConnection.socketIsValid()) {
                this.visGeometry.clear();
            }

            if (simParameters.newSimulationIsRunning) {
                this.visGeometry.mapFromJSON(
                    `https://aics-agentviz-data.s3.us-east-2.amazonaws.com/visdata/${simParameters.trajectoryPlaybackFile}.json`,
                    onJsonDataArrived
                );
                simParameters.newSimulationIsRunning = false;
            }

            this.visGeometry.render();
            this.lastRenderTime = Date.now();
        }

        if (visData.hasNewData()) {
            this.visGeometry.colorVariant = visData.colorVariant;
            this.visGeometry.update(visData.agents);
            this.dispatchUpdatedTime(visData.time);
            visData.newDataHasBeenHandled();
        }

        this.animationRequestID = requestAnimationFrame(this.animate);
    };

    public render() {
        const {
            devgui,
            agentSimController,
            width,
            height,
        } = this.props;

        const {
            simParameters,
            netConnection,
            visData,
        } = agentSimController;

        // style is specified below so that the size
        // can be passed as a react property
        return (
            <div
                id="vdom"
                style={
                    {
                        height: height,
                        width: width,
                    }
                }
                ref={this.vdomRef}
            >
                {devgui && (
                    <DevGUI
                        simParams={simParameters}
                        visData={visData}
                        netConnection={netConnection}
                    />
                )}
            </div>
        );
    }
}

export default Viewport;
