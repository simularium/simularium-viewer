import * as React from 'react';
import jsLogger from 'js-logger';
import AgentSimController from '../controller';

import {
    forOwn,
} from "lodash";
// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';

import { VisGeometry, DevGUI } from "../agentsim";

interface ViewportProps {
    height: number;
    width: number;
    devgui: boolean;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void | undefined;
    agentSimController: AgentSimController;
    onJsonDataArrived: any;
    onTrajectoryFileInfoChanged: (cachedData: any) => void | undefined;
    highlightedParticleType: number | string;
    loadInitialData: boolean;
    showMeshes: boolean;
    showPaths: boolean;
}

interface TimeData {
    time: number;
    frameNumber: number;
}

interface FrameJSON {
    frameNumber: number;
}

interface FileHTML extends File {
    text: Function;
}

function parseFrames(files: FileHTML[], outParsedFiles: object[]): Promise<void> {
    var p = Promise.resolve();
    files.forEach(file => {
        p = p.then(() => {
            return file.text().then((text) => {
                let json = JSON.parse(text);
                outParsedFiles.push(json);
            });
        })
    });
    return p;
}

function sortFrames(a: FrameJSON, b: FrameJSON): number {
    return a.frameNumber > b.frameNumber ? 1 : -1;
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

    private cacheJSON: Function;
    private clearCache: Function;

    public static defaultProps = {
        height: 800,
        width: 800,
        devgui: false,
        highlightedParticleType: -1,
        loadInitialData: true,
        showMeshes: true,
        showPaths: true,
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
        this.visGeometry.createMeshes();
        this.vdomRef = React.createRef();
        this.dispatchUpdatedTime = this.dispatchUpdatedTime.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.lastRenderTime = Date.now();
        this.onPickObject = this.onPickObject.bind(this);

        this.handlers = {
            contextmenu: this.onPickObject,
            dragover: this.onDragOver,
            drop: this.onDrop
        };
        this.hit = false;
        this.raycaster = new THREE.Raycaster();
        this.animationRequestID = 0;

        this.cacheJSON = (json) => {
            agentSimController.cacheJSON(json);
        }

        this.clearCache = () => {
            agentSimController.clearLocahCache();
        }

    }

    public componentDidMount() {
        const {
            agentSimController,
            onTrajectoryFileInfoChanged,
            loadInitialData,
            onJsonDataArrived
        } = this.props;
        const {
            simParameters,
        } = agentSimController;
        this.visGeometry.reparent(this.vdomRef.current);

        simParameters.handleTrajectoryData = onTrajectoryFileInfoChanged;

        agentSimController.connect().then(() => {
            if (loadInitialData) {
                let fileName = agentSimController.getFile();
                this.visGeometry.mapFromJSON(
                    `https://aics-agentviz-data.s3.us-east-2.amazonaws.com/visdata/${fileName}.json`, onJsonDataArrived

                ).then(() => {
                    this.visGeometry.render();
                    this.lastRenderTime = Date.now();
                });
                agentSimController.initializeTrajectoryFile();
            }
        });

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
        const { height, width, showMeshes, showPaths } = this.props;
        this.visGeometry.setHighlightById(this.props.highlightedParticleType);
        this.visGeometry.setShowMeshes(showMeshes);
        this.visGeometry.setShowPaths(showPaths);
        if (prevProps.height !== height || prevProps.width !== width) {
            this.visGeometry.resize(width, height);
        }
    }

    public onDragOver = (e) => {
        let event = e as Event;
        if(event.stopPropagation) { event.stopPropagation() };
        event.preventDefault();
    }

    public onDrop = (e) => {
        this.onDragOver(e);
        let files = e.target.files || e.dataTransfer.files;
        this.clearCache();

        let parsedFiles = [];
        let filesArr: FileHTML[] = Array.from(files);
        let p = parseFrames(filesArr, parsedFiles);

        p.then(() => {
            parsedFiles.sort(sortFrames);
            for(let i = 0, l = parsedFiles.length; i < l; ++i)
            {
                let frameJSON = parsedFiles[i];
                this.cacheJSON(frameJSON);
            }
        });
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
        const oldFollowObject = this.visGeometry.getFollowObject();
        this.visGeometry.setFollowObject(null);
        const intersects = this.raycaster.intersectObjects(this.visGeometry.scene.children, true);
        if (intersects && intersects.length) {
            const obj = intersects[0].object;
            this.hit = true;
            if (oldFollowObject !== obj) {
                this.visGeometry.removePathForObject(oldFollowObject);
            }
            this.visGeometry.setFollowObject(obj);
            this.visGeometry.addPathForObject(obj);
        } else {
            if (oldFollowObject) {
                this.visGeometry.removePathForObject(oldFollowObject);
            }
            if (this.hit) {
                this.hit = false;
            }
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
            if (!visData.atLatestFrame()) {
                this.visGeometry.colorVariant = visData.colorVariant;
                this.visGeometry.update(visData.currentFrame());
                this.dispatchUpdatedTime(visData.time);
                visData.gotoNextFrame();
            }

            //if (!netConnection.socketIsValid()) {
            //this.visGeometry.clear();
            //}

            this.visGeometry.render();
            this.lastRenderTime = Date.now();
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
