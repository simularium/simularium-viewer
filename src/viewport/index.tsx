import * as React from "react";
import jsLogger from "js-logger";
import Stats from "three/examples/jsm/libs/stats.module";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import { forOwn, isEqual } from "lodash";

import SimulariumController from "../controller";
import {
    TrajectoryFileInfo,
    SelectionInterface,
    SelectionStateInfo,
    UIDisplayData,
} from "../simularium";
import { TrajectoryFileInfoAny } from "../simularium/types";
import { updateTrajectoryFileInfoFormat } from "../simularium/versionHandlers";
import { FrontEndError, ErrorLevel } from "../simularium/FrontEndError";
import { RenderStyle, VisGeometry, NO_AGENT } from "../visGeometry";
import { ColorChange } from "../simularium/SelectionInterface";
import FrameRecorder from "../simularium/FrameRecorder";
import { DEFAULT_FRAME_RATE } from "../constants";

export type PropColor = string | number | [number, number, number];

type ViewportProps = {
    renderStyle: RenderStyle;
    backgroundColor?: PropColor;
    agentColors?: number[] | string[]; //TODO: accept all Color formats
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
    onError?: (error: FrontEndError) => void;
    lockedCamera?: boolean;
    onRecordedMovie?: (blob: Blob) => void; // providing this callback enables movie recording
    disableCache?: boolean;
    maxCacheLength?: number;
} & Partial<DefaultProps>;

const defaultProps = {
    renderStyle: RenderStyle.WEBGL2_PREFERRED,
    backgroundColor: [0, 0, 0],
    height: 800,
    width: 800,
    loadInitialData: true,
    hideAllAgents: false,
    showPaths: true,
    showBounds: true,
    lockedCamera: false,
    disableCache: false,
    agentColors: [
        0x6ac1e5, 0xff2200, 0xee7967, 0xff6600, 0xd94d49, 0xffaa00, 0xffcc00,
        0x00ccff, 0x00aaff, 0x8048f3, 0x07f4ec, 0x79bd8f, 0x8800ff, 0xaa00ff,
        0xcc00ff, 0xff00cc, 0xff00aa, 0xff0088, 0xff0066, 0xff0044, 0xff0022,
        0xff0000, 0xccff00, 0xaaff00, 0x88ff00, 0x00ffcc, 0x66ff00, 0x44ff00,
        0x22ff00, 0x00ffaa, 0x00ff88, 0x00ffaa, 0x00ffff, 0x0066ff,
    ] as string[] | number[],
};

type DefaultProps = typeof defaultProps;

interface Click {
    x: number;
    y: number;
    time: number;
}

interface ViewportState {
    lastClick: Click;
    showRenderParamsGUI: boolean;
}

export interface TimeData {
    time: number;
    frameNumber: number;
}

// max time in milliseconds for a mouse/touch interaction to be considered a click;
const MAX_CLICK_TIME = 300;
// for float errors
const CLICK_TOLERANCE = 1e-4;

class Viewport extends React.Component<
    ViewportProps & DefaultProps,
    ViewportState
> {
    private visGeometry: VisGeometry;
    private selectionInterface: SelectionInterface;
    private recorder: FrameRecorder | null;
    private lastRenderTime: number;
    private startTime: number;
    private vdomRef: React.RefObject<HTMLDivElement>;
    private handlers: { [key: string]: (e: Event) => void };

    private hit: boolean;
    private animationRequestID: number;
    private lastRenderedAgentTime: number;

    private stats: Stats;
    public static defaultProps = defaultProps;

    private static isCustomEvent(event: Event): event is CustomEvent {
        return "detail" in event;
    }

    public constructor(props: ViewportProps & DefaultProps) {
        super(props);

        const loggerLevel =
            props.loggerLevel === "debug" ? jsLogger.DEBUG : jsLogger.OFF;

        this.animate = this.animate.bind(this);
        this.dispatchUpdatedTime = this.dispatchUpdatedTime.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);

        this.visGeometry = new VisGeometry(loggerLevel);
        this.props.simulariumController.visData.setMaxCacheLength(
            this.props.maxCacheLength
        );
        this.props.simulariumController.visData.clearCache();
        this.props.simulariumController.visData.setCacheEnabled(
            !this.props.disableCache
        );
        this.visGeometry.createMaterials(props.agentColors);
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
            showRenderParamsGUI: false,
        };
        if (this.props.onRecordedMovie === undefined) {
            this.recorder = null;
        } else {
            this.recorder = new FrameRecorder(() => {
                return this.visGeometry.renderDom as HTMLCanvasElement;
            }, this.props.onRecordedMovie);
        }
    }

    private onTrajectoryFileInfo(msg: TrajectoryFileInfoAny): void {
        const {
            simulariumController,
            onTrajectoryFileInfoChanged,
            onUIDisplayDataChanged,
            onError,
            agentColors,
        } = this.props;

        // Update TrajectoryFileInfo format to latest version
        const trajectoryFileInfo: TrajectoryFileInfo =
            updateTrajectoryFileInfoFormat(msg, onError);

        simulariumController.visData.timeStepSize =
            trajectoryFileInfo.timeStepSize;

        const bx = trajectoryFileInfo.size.x;
        const by = trajectoryFileInfo.size.y;
        const bz = trajectoryFileInfo.size.z;
        const epsilon = 0.000001;
        if (
            Math.abs(bx) < epsilon ||
            Math.abs(by) < epsilon ||
            Math.abs(bz) < epsilon
        ) {
            this.visGeometry.resetBounds();
        } else {
            this.visGeometry.resetBounds([bx, by, bz]);
        }
        // this can only happen right after resetBounds
        simulariumController.tickIntervalLength =
            this.visGeometry.tickIntervalLength;

        this.visGeometry.handleCameraData(trajectoryFileInfo.cameraDefault);
        this.visGeometry.handleAgentGeometry(trajectoryFileInfo.typeMapping);

        try {
            this.selectionInterface.parse(trajectoryFileInfo.typeMapping);
        } catch (e) {
            if (onError) {
                const error = e as Error;
                onError(
                    new FrontEndError(
                        `error parsing 'typeMapping' data, ${error.message}`,
                        ErrorLevel.ERROR
                    )
                );
            } else {
                console.log("error parsing 'typeMapping' data", e);
            }
        }
        const uiDisplayData = this.selectionInterface.getUIDisplayData();
        onTrajectoryFileInfoChanged(trajectoryFileInfo);
        this.visGeometry.colorHandler.resetDefaultColorsData(agentColors);

        const updatedColors = this.selectionInterface.setInitialAgentColors(
            uiDisplayData,
            agentColors,
            this.visGeometry.applyColorToAgents.bind(this.visGeometry)
        );
        if (!isEqual(updatedColors, agentColors)) {
            this.visGeometry.createMaterials(updatedColors);
        }

        onUIDisplayDataChanged(this.selectionInterface.getUIDisplayData());
    }

    public componentDidMount(): void {
        const {
            backgroundColor,
            simulariumController,
            loadInitialData,
            onError,
            lockedCamera,
        } = this.props;
        this.visGeometry.setCanvasOnTheDom(this.vdomRef.current, lockedCamera);
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
            this.visGeometry.setOnErrorCallBack(onError);
        }

        simulariumController.visGeometry = this.visGeometry;
        simulariumController.trajFileInfoCallback = (
            msg: TrajectoryFileInfoAny
        ) => {
            this.onTrajectoryFileInfo(msg);
        };

        simulariumController.postConnect = () => {
            if (loadInitialData) {
                simulariumController.initializeTrajectoryFile();
            }
        };
        simulariumController.startRecording = this.startRecording.bind(this);
        simulariumController.stopRecording = this.stopRecording.bind(this);

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
        this.visGeometry.destroyGui();

        if (this.vdomRef.current) {
            this.vdomRef.current.removeEventListener(
                "timeChange",
                this.handleTimeChange
            );
        }
        this.removeEventHandlersFromCanvas();
        this.stopAnimate();
    }

    public componentDidUpdate(
        prevProps: ViewportProps,
        prevState: ViewportState
    ): void {
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
            lockedCamera,
            disableCache,
        } = this.props;

        if (selectionStateInfo) {
            if (
                !isEqual(
                    selectionStateInfo.highlightedAgents,
                    prevProps.selectionStateInfo.highlightedAgents
                )
            ) {
                const highlightedIds =
                    this.selectionInterface.getHighlightedIds(
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
                const hiddenIds =
                    this.selectionInterface.getHiddenIds(selectionStateInfo);
                this.visGeometry.setVisibleByIds(hiddenIds);
            }
            if (
                !isEqual(
                    selectionStateInfo.colorChange,
                    prevProps.selectionStateInfo.colorChange
                ) &&
                selectionStateInfo.colorChange !== null
            ) {
                this.changeAgentsColor(selectionStateInfo.colorChange);
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
        if (prevProps.lockedCamera !== lockedCamera) {
            this.visGeometry.toggleControls(lockedCamera);
        }
        if (prevProps.disableCache !== disableCache) {
            this.props.simulariumController.visData.setCacheEnabled(
                !disableCache
            );
        }
        if (prevState.showRenderParamsGUI !== this.state.showRenderParamsGUI) {
            if (this.state.showRenderParamsGUI) {
                this.visGeometry.setupGui(this.vdomRef.current as HTMLElement);
            } else {
                this.visGeometry.destroyGui();
            }
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

    public handleKeyDown = (e: Event): void => {
        // the viewer canvas must have focus for the key press to work.
        if (e.target !== this.vdomRef.current) {
            return;
        }

        const event = e as KeyboardEvent;
        // control-option-1 (mac) or ctrl-alt-1 (windows)
        if (event.code === "Digit1" && event.altKey && event.ctrlKey) {
            const s = this.state.showRenderParamsGUI;
            this.setState({ showRenderParamsGUI: !s });
        }
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
            if (!this.props.lockedCamera) {
                this.vdomRef.current.style.cursor = "pointer";
            }
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
        document.addEventListener("keydown", this.handleKeyDown, false);
    }

    public removeEventHandlersFromCanvas(): void {
        forOwn(this.handlers, (handler, eventName) =>
            this.visGeometry.renderDom.removeEventListener(
                eventName,
                handler,
                false
            )
        );
        document.removeEventListener("keydown", this.handleKeyDown, false);
    }

    public onPickObject(posX: number, posY: number): void {
        // TODO: intersect with scene's children not including lights?
        // can we select a smaller number of things to hit test?
        const oldFollowObject = this.visGeometry.getFollowObject();

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
            if (!this.props.lockedCamera) {
                this.visGeometry.setFollowObject(intersectedObject);
                this.visGeometry.addPathForAgent(intersectedObject);
            }
        } else {
            if (oldFollowObject !== NO_AGENT) {
                this.visGeometry.removePathForAgent(oldFollowObject);
            }
            if (this.hit) {
                this.hit = false;
            }
            this.visGeometry.setFollowObject(NO_AGENT);
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

    public changeAgentsColor(colorChange: ColorChange): void {
        const { agent, color } = colorChange;
        const agentIds = this.selectionInterface.getAgentIdsByNamesAndTags([
            agent,
        ]);
        this.visGeometry.applyColorToAgents(agentIds, color);
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
        const framesPerSecond = DEFAULT_FRAME_RATE; // how often the view-port rendering is refreshed per second
        const timePerFrame = 1000 / framesPerSecond; // the time interval at which to re-render
        const now = Date.now();
        const elapsedTime = now - this.lastRenderTime;
        const totalElapsedTime = now - this.startTime;
        if (elapsedTime > timePerFrame) {
            if (simulariumController.isChangingFile) {
                this.visGeometry.render(totalElapsedTime);
                this.lastRenderTime = Date.now();
                this.lastRenderedAgentTime = -1;
                simulariumController.markFileChangeAsHandled();

                this.animationRequestID = requestAnimationFrame(this.animate);

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
            if (this.recorder?.isRecording) {
                this.recorder.onFrame();
            }
            this.stats.end();
            this.lastRenderTime = Date.now();
        }

        this.animationRequestID = requestAnimationFrame(this.animate);
    }

    public renderViewControls(): React.ReactElement {
        const { simulariumController } = this.props;
        return (
            <div className="view-controls">
                <button
                    onClick={simulariumController.resetCamera}
                    className="btn"
                >
                    <FontAwesomeIcon
                        icon={faSyncAlt}
                        transform="flip-h"
                        style={{ color: "#737373" }}
                    />
                </button>
                <button
                    onClick={simulariumController.centerCamera}
                    className="btn-work"
                >
                    Re-center
                </button>
                <button
                    onClick={simulariumController.reOrientCamera}
                    className="btn-word"
                >
                    Starting orientation
                </button>
            </div>
        );
    }

    public startRecording(): void {
        if (!this.recorder) {
            return;
        }
        this.recorder.start();
    }

    public stopRecording(): void {
        if (!this.recorder) {
            return;
        }
        this.recorder.stop();
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
                    tabIndex={0}
                    data-height={height}
                    data-width={width}
                >
                    {showCameraControls && this.renderViewControls()}
                </div>
            </>
        );
    }
}

export { RenderStyle };
export default Viewport;
