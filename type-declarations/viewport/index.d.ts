import * as React from "react";
import SimulariumController from "../controller";
import { TrajectoryFileInfo } from "../simularium";
export declare type PropColor = string | number | [number, number, number];
interface ViewportProps {
    backgroundColor: PropColor;
    height: number;
    width: number;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void | undefined;
    simulariumController: SimulariumController;
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
    private animationRequestID;
    private lastRenderedAgentTime;
    private stats;
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
    private configDragAndDrop;
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
    renderViewControls(): React.ReactElement;
    render(): React.ReactElement<HTMLElement>;
}
export default Viewport;
