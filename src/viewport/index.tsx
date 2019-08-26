import * as React from 'react';
import jsLogger from 'js-logger';
import {
    forOwn,
} from "lodash";
// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

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
    agentSimController: AgentSimController;
    onJsonDataArrived: any;
    highlightedParticleType: number | string;
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
    };

    constructor(props: ViewportProps) {
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
        this.lastRenderTime = Date.now();
        this.onPickObject = this.onPickObject.bind(this);

        this.handlers = {
            contextmenu: this.onPickObject
        };
        this.hit = false;
        this.raycaster = new THREE.Raycaster();
        this.animationRequestID = 0;
    }

    componentDidMount() {
        const {
            agentSimController,
        } = this.props;
        this.visGeometry.reparent(this.vdomRef.current);
        agentSimController.netConnection.connect();
        setInterval(agentSimController.netConnection.checkForUpdates.bind(agentSimController.netConnection), 1000);
        this.addEventHandlersToCanvas();

        this.animate();
    }

    componentWillUnmount() {
        const {
            agentSimController,
        } = this.props;
        this.removeEventHandlersFromCanvas();
        this.stopAnimate();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.visGeometry.setHighlightById(this.props.highlightedParticleType);
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

    onPickObject(event: MouseEvent) {
        console.log("click");
        
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
            console.log("HIT ", obj);
            this.hit = true;
            this.visGeometry.setFollowObject(obj);
        } else if (this.hit) {
            this.hit = false;
        }
    }

    stopAnimate() {
        if (this.animationRequestID !== 0) {
            cancelAnimationFrame(this.animationRequestID);
            this.animationRequestID = 0;
        }
    }

    animate() {
        const {
            agentSimController,
            onJsonDataArrived
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
            visData.newDataHasBeenHandled();
        }

        this.animationRequestID = requestAnimationFrame(this.animate);
    };

    render() {
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
        return (<div 
                id="vdom"
                style={
                    { 
                        height: height,
                        width: width,
                    }
                }
                ref={this.vdomRef}
            >
                {devgui && (<DevGUI 
                                simParams={simParameters}
                                visData={visData}
                                netConnection={netConnection}
                            />)}
            </div>
        );
    }
}

export default Viewport;
