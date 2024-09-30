import * as React from "react";
import SimulariumController from "../controller";
import { TrajectoryFileInfo, SelectionStateInfo, UIDisplayData } from "../simularium";
import { AgentData } from "../simularium/types";
import { FrontEndError } from "../simularium/FrontEndError";
import { RenderStyle } from "../visGeometry";
export type PropColor = string | number | [number, number, number];
type ViewportProps = {
    renderStyle: RenderStyle;
    backgroundColor?: PropColor;
    agentColors?: number[] | string[];
    height: number;
    width: number;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void | undefined;
    simulariumController: SimulariumController;
    onJsonDataArrived(any: any): void;
    onTrajectoryFileInfoChanged: (cachedData: TrajectoryFileInfo) => void | undefined;
    onUIDisplayDataChanged: (data: UIDisplayData) => void | undefined;
    loadInitialData: boolean;
    hideAllAgents: boolean;
    showPaths: boolean;
    showBounds: boolean;
    selectionStateInfo: SelectionStateInfo;
    showCameraControls: boolean;
    onError?: (error: FrontEndError) => void;
    lockedCamera?: boolean;
    onRecordedMovie?: (blob: Blob) => void;
    disableCache?: boolean;
    onFollowObjectChanged?: (agentData: AgentData) => void;
} & Partial<DefaultProps>;
declare const defaultProps: {
    renderStyle: RenderStyle;
    backgroundColor: number[];
    height: number;
    width: number;
    loadInitialData: boolean;
    hideAllAgents: boolean;
    showPaths: boolean;
    showBounds: boolean;
    lockedCamera: boolean;
    disableCache: boolean;
    agentColors: string[] | number[];
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
declare class Viewport extends React.Component<ViewportProps & DefaultProps, ViewportState> {
    private visGeometry;
    private selectionInterface;
    private recorder;
    private lastRenderTime;
    private startTime;
    private vdomRef;
    private handlers;
    private hit;
    private animationRequestID;
    private lastRenderedAgentTime;
    private stats;
    static defaultProps: {
        renderStyle: RenderStyle;
        backgroundColor: number[];
        height: number;
        width: number;
        loadInitialData: boolean;
        hideAllAgents: boolean;
        showPaths: boolean;
        showBounds: boolean;
        lockedCamera: boolean;
        disableCache: boolean;
        agentColors: string[] | number[];
    };
    private static isCustomEvent;
    constructor(props: ViewportProps & DefaultProps);
    private onTrajectoryFileInfo;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: ViewportProps, prevState: ViewportState): void;
    isClick: (thisClick: Click) => boolean;
    handleTouchStart: (e: Event) => void;
    handleKeyDown: (e: Event) => void;
    handleTouchEnd: (e: Event) => void;
    handleClickStart: (e: Event) => void;
    handlePointerDown: (e: Event) => void;
    handleMouseUp: (e: Event) => void;
    handlePointerUp: (e: Event) => void;
    handleMouseMove: (e: Event) => void;
    addEventHandlersToCanvas(): void;
    removeEventHandlersFromCanvas(): void;
    onPickObject(posX: number, posY: number): void;
    private updateFollowObjectData;
    private handleTimeChange;
    private dispatchUpdatedTime;
    changeAgentsColor(appliedColors: UIDisplayData): void;
    stopAnimate(): void;
    animate(): void;
    renderViewControls(): React.ReactElement;
    startRecording(): void;
    stopRecording(): void;
    render(): React.ReactElement<HTMLElement>;
}
export { RenderStyle };
export default Viewport;
