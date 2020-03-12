import * as React from "react";
import jsLogger from "js-logger";
import AgentSimController from "../controller";

import { forOwn } from "lodash";
// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from "three";

import { VisGeometry2, DevGUI } from "../agentsim";

interface ViewportProps {
    height: number;
    width: number;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void | undefined;
    agentSimController: AgentSimController;
    onJsonDataArrived: any;
    onTrajectoryFileInfoChanged: (cachedData: any) => void | undefined;
    highlightedParticleType: number | string;
    loadInitialData: boolean;
    showMeshes: boolean;
    showPaths: boolean;
    showBounds: boolean;
}

interface TimeData {
    time: number;
    frameNumber: number;
}

interface FrameJSON {
    frameNumber: number;
}

// Typescript's File definition is missing this function
//  which is part of the HTML standard on all browsers
//  and needed below
interface FileHTML extends File {
    text: Function;
}

// This function returns a promise that resolves after all of the objects in
//  the 'files' parameter have been parsed into text and put in the `outParsedFiles` parameter
function parseFilesToText(
    files: FileHTML[],
    outParsedFiles: object[]
): Promise<void> {
    var p = Promise.resolve();
    files.forEach(file => {
        p = p.then(() => {
            return file.text().then(text => {
                let json = JSON.parse(text);
                outParsedFiles.push(json);
            });
        });
    });
    return p;
}

function sortFrames(a: FrameJSON, b: FrameJSON): number {
    return a.frameNumber > b.frameNumber ? 1 : -1;
}

function getJsonUrl(trajectoryName) {
    return `https://aics-agentviz-data.s3.us-east-2.amazonaws.com/visdata/${trajectoryName}.json`;
}

class Viewport extends React.Component<ViewportProps> {
    // NOTE: this can be typed in the future, but they may change signifantly and I dont want to at the moment. -MMRM
    private visGeometry: any;
    private lastRenderTime: number;
    private startTime: number;
    private vdomRef: React.RefObject<HTMLInputElement>;
    private handlers: { [key: string]: (e: any) => void };

    private hit: boolean;
    private raycaster: THREE.Raycaster;
    private animationRequestID: number;
    private lastRenderedAgentTime: number;

    public static defaultProps = {
        height: 800,
        width: 800,
        highlightedParticleType: -1,
        loadInitialData: true,
        showMeshes: true,
        showPaths: true,
        showBounds: true,
    };

    private static isCustomEvent(event: Event): event is CustomEvent {
        return "detail" in event;
    }

    public constructor(props: ViewportProps) {
        super(props);

        const loggerLevel =
            props.loggerLevel === "debug" ? jsLogger.DEBUG : jsLogger.OFF;
        const { agentSimController } = this.props;

        const colors = [
            0x6ac1e5,
            0xff2200,
            0xee7967,
            0xff6600,
            0xd94d49,
            0xffaa00,
            0xffcc00,
            0x00ccff,
            0x00aaff,
            0x8048f3,
            0x07f4ec,
            0x79bd8f,
            0x8800ff,
            0xaa00ff,
            0xcc00ff,
            0xff00cc,
            0xff00aa,
            0xff0088,
            0xff0066,
            0xff0044,
            0xff0022,
            0xff0000,
            0xccff00,
            0xaaff00,
            0x88ff00,
            0x00ffcc,
            0x66ff00,
            0x44ff00,
            0x22ff00,
            0x00ffaa,
            0x00ff88,
            0x00ffaa,
            0x00ffff,
            0x0066ff,
        ];

        this.visGeometry = new VisGeometry2(loggerLevel);
        this.animate = this.animate.bind(this);
        this.visGeometry.setupScene();
        this.visGeometry.createMaterials(colors);
        this.visGeometry.createMeshes();
        this.vdomRef = React.createRef();
        this.dispatchUpdatedTime = this.dispatchUpdatedTime.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.lastRenderTime = Date.now();
        this.startTime = Date.now();
        this.onPickObject = this.onPickObject.bind(this);

        this.handlers = {
            contextmenu: this.onPickObject,
            dragover: this.onDragOver,
            drop: this.onDrop,
        };
        this.hit = false;
        this.raycaster = new THREE.Raycaster();
        this.animationRequestID = 0;
        this.lastRenderedAgentTime = -1;
    }

    public componentDidMount() {
        const {
            agentSimController,
            onTrajectoryFileInfoChanged,
            loadInitialData,
            onJsonDataArrived,
        } = this.props;
        const { netConnection } = agentSimController;
        this.visGeometry.reparent(this.vdomRef.current);

        netConnection.onTrajectoryFileInfoArrive = msg => {
            this.visGeometry.handleTrajectoryData(msg);
            onTrajectoryFileInfoChanged(msg);
        };

        agentSimController.connect().then(() => {
            if (loadInitialData) {
                let fileName = agentSimController.getFile();
                this.visGeometry
                    .mapFromJSON(
                        fileName,
                        getJsonUrl(fileName),
                        onJsonDataArrived
                    )
                    .then(() => {
                        this.visGeometry.render();
                        this.lastRenderTime = Date.now();
                    });
                agentSimController.initializeTrajectoryFile();
            }
        });

        if (this.vdomRef.current) {
            this.vdomRef.current.addEventListener(
                "timeChange",
                this.handleTimeChange,
                false
            );
        }
        this.addEventHandlersToCanvas();

        this.startTime = Date.now();
        this.animate();
    }

    public componentWillUnmount() {
        if (this.vdomRef.current) {
            this.vdomRef.current.removeEventListener(
                "timeChange",
                this.handleTimeChange
            );
        }
        this.removeEventHandlersFromCanvas();
        this.stopAnimate();
    }

    public componentDidUpdate(prevProps: ViewportProps) {
        const { height, width, showMeshes, showPaths, showBounds } = this.props;
        this.visGeometry.setHighlightById(this.props.highlightedParticleType);
        this.visGeometry.setShowMeshes(showMeshes);
        this.visGeometry.setShowPaths(showPaths);
        this.visGeometry.setShowBounds(showBounds);
        if (prevProps.height !== height || prevProps.width !== width) {
            this.visGeometry.resize(width, height);
        }
    }

    private cacheJSON = json => {
        this.props.agentSimController.cacheJSON(json);
    };

    private clearCache = () => {
        this.props.agentSimController.disableNetworkCommands();
        this.props.agentSimController.clearLocalCache();
    };

    public onDragOver = e => {
        let event = e as Event;
        if (event.stopPropagation) {
            event.stopPropagation();
        }
        event.preventDefault();
    };

    public onDrop = e => {
        this.onDragOver(e);
        let files = e.target.files || e.dataTransfer.files;
        this.clearCache();

        let parsedFiles = [];
        let filesArr: FileHTML[] = Array.from(files);
        let p = parseFilesToText(filesArr, parsedFiles);

        p.then(() => {
            parsedFiles.sort(sortFrames);
            this.visGeometry.resetMapping();
            for (let i = 0, l = parsedFiles.length; i < l; ++i) {
                let frameJSON = parsedFiles[i];
                this.cacheJSON(frameJSON);
            }
        });
    };

    public addEventHandlersToCanvas() {
        forOwn(this.handlers, (handler, eventName) =>
            this.visGeometry.renderDom.addEventListener(
                eventName,
                handler,
                false
            )
        );
    }

    public removeEventHandlersFromCanvas() {
        forOwn(this.handlers, (handler, eventName) =>
            this.visGeometry.renderDom.removeEventListener(
                eventName,
                handler,
                false
            )
        );
    }

    public resetCamera() {
        this.visGeometry.resetCamera();
    }

    public onPickObject(event: MouseEvent) {
        const size = new THREE.Vector2();
        this.visGeometry.renderer.getSize(size);

        const mouse = {
            x: (event.offsetX / size.x) * 2 - 1,
            y: -(event.offsetY / size.y) * 2 + 1,
        };

        // hit testing
        this.raycaster.setFromCamera(mouse, this.visGeometry.camera);
        // TODO: intersect with scene's children not including lights?
        // can we select a smaller number of things to hit test?
        const oldFollowObject = this.visGeometry.getFollowObject();
        this.visGeometry.setFollowObject(null);
        const intersects = this.raycaster.intersectObjects(
            this.visGeometry.scene.children,
            true
        );
        if (intersects && intersects.length) {
            let obj = intersects[0].object;
            // if the object has a parent and the parent is not the scene, use that.
            // assumption: only one level of object hierarchy.
            if (obj.parent && !(obj.parent instanceof THREE.Scene)) {
                obj = obj.parent;
            }
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
        const { onTimeChange } = this.props;
        if (!Viewport.isCustomEvent(e)) {
            throw new Error("not custom event");
        }
        onTimeChange(e.detail);
    }

    private dispatchUpdatedTime(timeData) {
        const event = new CustomEvent("timeChange", { detail: timeData });
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
        const { agentSimController } = this.props;
        const { netConnection, visData } = agentSimController;
        const framesPerSecond = 60; // how often the view-port rendering is refreshed per second
        const timePerFrame = 1000 / framesPerSecond; // the time interval at which to re-render
        const now = Date.now();
        const elapsedTime = now - this.lastRenderTime;
        const totalElapsedTime = now - this.startTime;
        if (elapsedTime > timePerFrame) {
            if (agentSimController.hasChangedFile) {
                this.visGeometry.clear();
                this.visGeometry.resetMapping();

                let p = this.visGeometry.mapFromJSON(
                    agentSimController.getFile(),
                    getJsonUrl(agentSimController.getFile())
                );

                p.then(() => {
                    this.visGeometry.render(totalElapsedTime);
                    this.lastRenderTime = Date.now();
                    this.lastRenderedAgentTime = -1;
                    this.animationRequestID = requestAnimationFrame(
                        this.animate
                    );
                });

                p.catch(() => {
                    this.visGeometry.render(totalElapsedTime);
                    this.lastRenderTime = Date.now();
                    this.lastRenderedAgentTime = -1;
                    this.animationRequestID = requestAnimationFrame(
                        this.animate
                    );
                });

                agentSimController.markFileChangeAsHandled();

                return;
            }

            if (visData.currentFrameData.time != this.lastRenderedAgentTime) {
                let currentAgents = visData.currentFrame();
                if (currentAgents.length > 0) {
                    this.dispatchUpdatedTime(visData.currentFrameData);
                    this.visGeometry.update(currentAgents);
                    this.lastRenderedAgentTime = visData.currentFrameData.time;
                }
            }

            if (!visData.atLatestFrame() && !agentSimController.paused()) {
                visData.gotoNextFrame();
            }

            this.visGeometry.render(totalElapsedTime);
            this.lastRenderTime = Date.now();
        }

        this.animationRequestID = requestAnimationFrame(this.animate);
    }

    public render() {
        const { agentSimController, width, height } = this.props;

        const { netConnection, visData } = agentSimController;

        // style is specified below so that the size
        // can be passed as a react property
        return (
            <div
                id="vdom"
                style={{
                    height: height,
                    width: width,
                }}
                ref={this.vdomRef}
            ></div>
        );
    }
}

export default Viewport;
