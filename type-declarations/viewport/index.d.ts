import * as React from "react";
import AgentSimController from "../controller";
interface TrajectoryFileInfo {
    timeStepSize: number;
    totalDuration: number;
}
export declare type PropColor = string | number | [number, number, number];
interface ViewportProps {
    backgroundColor: PropColor;
    height: number;
    width: number;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void | undefined;
    agentSimController: AgentSimController;
    onJsonDataArrived: Function;
    onTrajectoryFileInfoChanged: (cachedData: TrajectoryFileInfo) => void | undefined;
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
declare class Viewport extends React.Component<ViewportProps> {
    private visGeometry;
    private lastRenderTime;
    private startTime;
    private vdomRef;
    private handlers;
    private hit;
    private raycaster;
    private animationRequestID;
    private lastRenderedAgentTime;
    static defaultProps: {
        backgroundColor: number[];
        height: number;
        width: number;
        highlightedParticleType: number;
        loadInitialData: boolean;
        showMeshes: boolean;
        showPaths: boolean;
        showBounds: boolean;
    };
    private static isCustomEvent;
    constructor(props: ViewportProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: ViewportProps): void;
    private cacheJSON;
    private clearCache;
    onDragOver: (e: Event) => void;
    onDrop: (e: Event) => void;
    addEventHandlersToCanvas(): void;
    removeEventHandlersFromCanvas(): void;
    resetCamera(): void;
    switchRenderStyle(): void;
    onPickObject(e: Event): void;
    private handleTimeChange;
    private dispatchUpdatedTime;
    stopAnimate(): void;
    animate(): void;
    render(): React.ReactElement<HTMLElement>;
}
export default Viewport;
