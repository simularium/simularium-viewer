import * as React from "react";
import jsLogger from "js-logger";
import Stats from "three/examples/jsm/libs/stats.module";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import SimulariumController from "../controller";

import { forOwn, isEqual } from "lodash";

import {
    VisGeometry,
    TrajectoryFileInfo,
    SelectionInterface,
    SelectionStateInfo,
    UIDisplayData,
    NO_AGENT,
} from "../simularium";
import { RenderStyle } from "../simularium/VisGeometry";
import { updateTrajectoryFileInfoFormat } from "../simularium/versionHandlers";

export type PropColor = string | number | [number, number, number];

interface ViewportProps {
    renderStyle: RenderStyle;
    backgroundColor?: PropColor;
    agentColors?: (number | string)[]; //TODO: accept all Color formats
    height: number;
    width: number;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void | undefined;
    simulariumController: SimulariumController;
    onJsonDataArrived(any): void;
    onTrajectoryFileInfoChanged: (
        cachedData: TrajectoryFileInfo
    ) => void | undefined;
    onUIDisplayDataChanged: (data: UIDisplayData) => void | undefined;
    loadInitialData: boolean;
    hideAllAgents: boolean;
    showPaths: boolean;
    showBounds: boolean;
    selectionStateInfo: SelectionStateInfo;
    showCameraControls: boolean;
    onError?: (errorMessage: string) => void;
}

interface Click {
    x: number;
    y: number;
    time: number;
}

interface ViewportState {
    lastClick: Click;
}

export interface TimeData {
    time: number;
    frameNumber: number;
}

// max time in milliseconds for a mouse/touch interaction to be considered a click;
const MAX_CLICK_TIME = 300;
// for float errors
const CLICK_TOLERANCE = 1e-4;

class Viewport extends React.Component<ViewportProps, ViewportState> {
    private visGeometry: VisGeometry;
    private selectionInterface: SelectionInterface;
    private lastRenderTime: number;
    private startTime: number;
    private vdomRef: React.RefObject<HTMLInputElement>;
    private handlers: { [key: string]: (e: Event) => void };

    private hit: boolean;
    private animationRequestID: number;
    private lastRenderedAgentTime: number;

    private stats: Stats;

    public static defaultProps = {
        renderStyle: RenderStyle.MOLECULAR,
        backgroundColor: [0, 0, 0],
        height: 800,
        width: 800,
        loadInitialData: true,
        hideAllAgents: false,
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
        const colors = props.agentColors || [
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

        this.animate = this.animate.bind(this);
        this.dispatchUpdatedTime = this.dispatchUpdatedTime.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.resetCamera = this.resetCamera.bind(this);
        this.centerCamera = this.centerCamera.bind(this);
        this.reOrientCamera = this.reOrientCamera.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);

        this.visGeometry = new VisGeometry(loggerLevel);
        this.props.simulariumController.visData.clearCache();
        this.visGeometry.setupScene();
        this.visGeometry.createMaterials(colors);
        this.vdomRef = React.createRef();
        this.lastRenderTime = Date.now();
        this.startTime = Date.now();
        this.onPickObject = this.onPickObject.bind(this);
        this.stats = Stats();
        this.stats.showPanel(1);

        this.handlers = {
            touchstart: this.handleTouchStart,
            touchend: this.handleTouchEnd,
            mousedown: this.handleClickStart,
            mouseup: this.handleMouseUp,
            pointerdown: this.handlePointerDown,
            pointerup: this.handlePointerUp,
            mousemove: this.handleMouseMove,
        };
        this.hit = false;
        this.animationRequestID = 0;
        this.lastRenderedAgentTime = -1;
        this.selectionInterface = new SelectionInterface();
        this.state = {
            lastClick: {
                x: 0,
                y: 0,
                time: 0,
            },
        };
    }

    public componentDidMount(): void {
        const {
            backgroundColor,
            simulariumController,
            onTrajectoryFileInfoChanged,
            onUIDisplayDataChanged,
            loadInitialData,
            onJsonDataArrived,
            onError,
        } = this.props;
        this.visGeometry.reparent(this.vdomRef.current);
        if (backgroundColor !== undefined) {
            this.visGeometry.setBackgroundColor(backgroundColor);
        }
        if (this.props.loggerLevel === "debug") {
            if (this.vdomRef && this.vdomRef.current) {
                this.stats.dom.style.position = "absolute";
                this.vdomRef.current.appendChild(this.stats.dom);
            }
        }
        if (onError) {
            simulariumController.onError = onError;
        }

        simulariumController.resetCamera = this.resetCamera;
        simulariumController.reOrientCamera = this.reOrientCamera;
        simulariumController.centerCamera = this.centerCamera;
        simulariumController.zoomIn = this.zoomIn;
        simulariumController.zoomOut = this.zoomOut;
        simulariumController.visGeometry = this.visGeometry;
        simulariumController.trajFileInfoCallback = (
            msg: TrajectoryFileInfo
        ) => {
            this.visGeometry.handleTrajectoryData(msg);
            // handleTrajectoryData() above creates a new bounding box and tick marks
            // (via resetBounds()) and sets VisGeometry.tickIntervalLength, which is now
            // available for use as the length of the scale bar in the UI.

            // TODO: Determine and save scale bar info as simulariumController.scaleBarLabel here
            // instead of as simulariumController.tickIntervalLength
            // (This would involve multiplying visGeometry.tickIntervalLength by spatial unit
            // magnitude and, if we want, determining the appropriate display unit for v1 data)
            simulariumController.tickIntervalLength = this.visGeometry.tickIntervalLength;
            try {
                this.selectionInterface.parse(msg.typeMapping);
            } catch (e) {
                if (onError) {
                    onError(`error parsing 'typeMapping' data, ${e.message}`);
                } else {
                    console.log("error parsing 'typeMapping' data", e);
                }
            }
            const newMsg = updateTrajectoryFileInfoFormat(msg)
            onTrajectoryFileInfoChanged(newMsg);

            this.visGeometry.clearColorMapping();
            const uiDisplayData = this.selectionInterface.getUIDisplayData();
            let colorIndex = 0;
            uiDisplayData.forEach((entry) => {
                const ids = this.selectionInterface.getIds(entry.name);
                this.visGeometry.setColorForIds(ids, colorIndex);

                entry.color =
                    "#" +
                    this.visGeometry
                        .getColorForIndex(colorIndex)
                        .getHexString();
                colorIndex = colorIndex + 1;
            });

            onUIDisplayDataChanged(uiDisplayData);
        };

        simulariumController.postConnect = () => {
            if (loadInitialData) {
                const fileName = simulariumController.getFile();
                this.visGeometry
                    .mapFromJSON(
                        fileName,
                        simulariumController.getGeometryFile(),
                        simulariumController.getAssetPrefix(),
                        onJsonDataArrived
                    )
                    .then(() => {
                        this.visGeometry.render(this.startTime);
                        this.lastRenderTime = Date.now();
                    });
                simulariumController.initializeTrajectoryFile();
            }
        };

        if (simulariumController.netConnection) {
            simulariumController.connect();
        }

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

    public componentWillUnmount(): void {
        if (this.vdomRef.current) {
            this.vdomRef.current.removeEventListener(
                "timeChange",
                this.handleTimeChange
            );
        }
        this.removeEventHandlersFromCanvas();
        this.stopAnimate();
    }

    public componentDidUpdate(prevProps: ViewportProps): void {
        const {
            backgroundColor,
            agentColors,
            height,
            width,
            renderStyle,
            hideAllAgents,
            showPaths,
            showBounds,
            selectionStateInfo,
        } = this.props;

        if (selectionStateInfo) {
            if (
                !isEqual(
                    selectionStateInfo.highlightedAgents,
                    prevProps.selectionStateInfo.highlightedAgents
                )
            ) {
                const highlightedIds = this.selectionInterface.getHighlightedIds(
                    selectionStateInfo
                );
                this.visGeometry.setHighlightByIds(highlightedIds);
            }
            if (
                !isEqual(
                    selectionStateInfo.hiddenAgents,
                    prevProps.selectionStateInfo.hiddenAgents
                )
            ) {
                const hiddenIds = this.selectionInterface.getHiddenIds(
                    selectionStateInfo
                );
                this.visGeometry.setVisibleByIds(hiddenIds);
            }
        }

        // note that if the system does not support the molecular render style, then
        // the visGeometry's internal render style will be different than what this prop says.
        if (renderStyle !== prevProps.renderStyle) {
            this.visGeometry.setRenderStyle(renderStyle);
        }
        if (hideAllAgents !== prevProps.hideAllAgents) {
            this.visGeometry.toggleAllAgentsHidden(hideAllAgents);
        }
        if (showPaths !== prevProps.showPaths) {
            this.visGeometry.setShowPaths(showPaths);
        }
        if (showBounds !== prevProps.showBounds) {
            this.visGeometry.setShowBounds(showBounds);
        }
        if (backgroundColor !== prevProps.backgroundColor) {
            this.visGeometry.setBackgroundColor(backgroundColor);
        }
        if (agentColors && !isEqual(agentColors, prevProps.agentColors)) {
            this.visGeometry.createMaterials(agentColors);
        }
        if (prevProps.height !== height || prevProps.width !== width) {
            this.visGeometry.resize(width, height);
        }
    }

    public isClick = (thisClick: Click): boolean => {
        const { lastClick } = this.state;
        const t = Date.now() - lastClick.time;
        if (t > MAX_CLICK_TIME) {
            // long click
            return false;
        }

        if (
            Math.abs(thisClick.x - lastClick.x) > CLICK_TOLERANCE ||
            Math.abs(thisClick.y - lastClick.y) > CLICK_TOLERANCE
        ) {
            // mouse moved just rotate the field
            return false;
        }
        return true;
    };

    public handleTouchStart = (e: Event): void => {
        const event = e as TouchEvent;
        const touch = event.touches[0];
        this.setState({
            lastClick: {
                x: touch.pageX,
                y: touch.pageY,
                time: Date.now(),
            },
        });
    };

    public handleTouchEnd = (e: Event): void => {
        const event = e as TouchEvent;
        const touch = event.changedTouches[0];
        const thisClick = {
            x: touch.pageX,
            y: touch.pageY,
            time: Date.now(),
        };

        if (this.isClick(thisClick)) {
            // pass event to pick object because it was a true click and not a drag
            const canvas = this.vdomRef.current;
            if (!canvas) {
                return;
            }
            const r = canvas.getBoundingClientRect();
            const offsetX = touch.clientX - r.left;
            const offsetY = touch.clientY - r.top;
            this.onPickObject(offsetX, offsetY);
        }
    };

    public handleClickStart = (e: Event): void => {
        const event = e as MouseEvent;
        this.setState({
            lastClick: {
                x: event.x,
                y: event.y,
                time: Date.now(),
            },
        });
    };
    public handlePointerDown = (e: Event): void => {
        const event = e as PointerEvent;
        this.setState({
            lastClick: {
                x: event.x,
                y: event.y,
                time: Date.now(),
            },
        });
    };

    public handleMouseUp = (e: Event): void => {
        const event = e as MouseEvent;
        const thisClick = {
            x: event.x,
            y: event.y,
            time: Date.now(),
        };
        if (this.isClick(thisClick)) {
            // pass event to pick object because it was a true click and not a drag
            this.onPickObject(event.offsetX, event.offsetY);
        }
    };
    public handlePointerUp = (e: Event): void => {
        const event = e as PointerEvent;
        const thisClick = {
            x: event.x,
            y: event.y,
            time: Date.now(),
        };
        if (this.isClick(thisClick)) {
            // pass event to pick object because it was a true click and not a drag
            this.onPickObject(event.offsetX, event.offsetY);
        }
    };

    public handleMouseMove = (e: Event): void => {
        const event = e as MouseEvent;
        if (!this.vdomRef.current) {
            return;
        }
        const intersectedObject = this.visGeometry.hitTest(
            event.offsetX,
            event.offsetY
        );
        if (intersectedObject !== NO_AGENT) {
            this.vdomRef.current.style.cursor = "pointer";
        } else {
            this.vdomRef.current.style.cursor = "default";
        }
    };

    public addEventHandlersToCanvas(): void {
        forOwn(this.handlers, (handler, eventName) =>
            this.visGeometry.renderDom.addEventListener(
                eventName,
                handler,
                false
            )
        );
    }

    public removeEventHandlersFromCanvas(): void {
        forOwn(this.handlers, (handler, eventName) =>
            this.visGeometry.renderDom.removeEventListener(
                eventName,
                handler,
                false
            )
        );
    }

    public resetCamera(): void {
        this.visGeometry.resetCamera();
    }

    public centerCamera(): void {
        this.visGeometry.centerCamera();
    }

    public reOrientCamera(): void {
        this.visGeometry.reOrientCamera();
    }

    public zoomIn(): void {
        this.visGeometry.zoomIn();
    }

    public zoomOut(): void {
        this.visGeometry.zoomOut();
    }

    public onPickObject(posX: number, posY: number): void {
        // TODO: intersect with scene's children not including lights?
        // can we select a smaller number of things to hit test?
        const oldFollowObject = this.visGeometry.getFollowObject();
        this.visGeometry.setFollowObject(NO_AGENT);

        // hit testing
        const intersectedObject = this.visGeometry.hitTest(posX, posY);
        if (intersectedObject !== NO_AGENT) {
            this.hit = true;
            if (
                oldFollowObject !== intersectedObject &&
                oldFollowObject !== NO_AGENT
            ) {
                this.visGeometry.removePathForAgent(oldFollowObject);
            }
            this.visGeometry.setFollowObject(intersectedObject);
            this.visGeometry.addPathForAgent(intersectedObject);
        } else {
            if (oldFollowObject !== NO_AGENT) {
                this.visGeometry.removePathForAgent(oldFollowObject);
            }
            if (this.hit) {
                this.hit = false;
            }
        }
    }

    private handleTimeChange(e: Event): void {
        const { onTimeChange } = this.props;
        if (!Viewport.isCustomEvent(e)) {
            throw new Error("not custom event");
        }
        onTimeChange(e.detail);
    }

    private dispatchUpdatedTime(timeData): void {
        const event = new CustomEvent("timeChange", { detail: timeData });
        if (this.vdomRef.current) {
            this.vdomRef.current.dispatchEvent(event);
        }
    }

    public stopAnimate(): void {
        if (this.animationRequestID !== 0) {
            cancelAnimationFrame(this.animationRequestID);
            this.animationRequestID = 0;
        }
    }

    public animate(): void {
        const { simulariumController } = this.props;
        const { visData } = simulariumController;
        const framesPerSecond = 60; // how often the view-port rendering is refreshed per second
        const timePerFrame = 1000 / framesPerSecond; // the time interval at which to re-render
        const now = Date.now();
        const elapsedTime = now - this.lastRenderTime;
        const totalElapsedTime = now - this.startTime;
        if (elapsedTime > timePerFrame) {
            if (simulariumController.hasChangedFile) {
                this.visGeometry.clearForNewTrajectory();
                // skip fetch if local file
                const p = simulariumController.isLocalFile
                    ? Promise.resolve()
                    : this.visGeometry.mapFromJSON(
                          simulariumController.getFile(),
                          simulariumController.getGeometryFile(),
                          simulariumController.getAssetPrefix()
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

                simulariumController.markFileChangeAsHandled();

                return;
            }

            if (visData.currentFrameData.time != this.lastRenderedAgentTime) {
                const currentAgents = visData.currentFrame();
                if (currentAgents.length > 0) {
                    this.dispatchUpdatedTime(visData.currentFrameData);
                    this.visGeometry.update(currentAgents);
                    this.lastRenderedAgentTime = visData.currentFrameData.time;
                }
            }

            if (!visData.atLatestFrame() && !simulariumController.paused()) {
                visData.gotoNextFrame();
            }
            this.stats.begin();
            this.visGeometry.render(totalElapsedTime);
            this.stats.end();
            this.lastRenderTime = Date.now();
        }

        this.animationRequestID = requestAnimationFrame(this.animate);
    }

    public renderViewControls(): React.ReactElement {
        return (
            <div className="view-controls">
                <button onClick={this.resetCamera} className="btn">
                    <FontAwesomeIcon
                        icon={faSyncAlt}
                        transform="flip-h"
                        style={{ color: "#737373" }}
                    />
                </button>
                <button onClick={this.centerCamera} className="btn-work">
                    Re-center
                </button>
                <button onClick={this.reOrientCamera} className="btn-word">
                    Starting orientation
                </button>
            </div>
        );
    }

    public render(): React.ReactElement<HTMLElement> {
        const { width, height, showCameraControls } = this.props;

        // style is specified below so that the size
        // can be passed as a react property
        return (
            <>
                <div
                    id="vdom"
                    style={{
                        height: height,
                        width: width,
                        position: "relative",
                    }}
                    ref={this.vdomRef}
                >
                    {showCameraControls && this.renderViewControls()}
                </div>
            </>
        );
    }
}

export { RenderStyle };
export default Viewport;
