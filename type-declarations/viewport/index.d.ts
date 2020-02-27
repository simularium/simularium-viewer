import * as React from 'react';
import AgentSimController from '../controller';
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
    onDragOver: (e: any) => void;
    onDrop: (e: any) => void;
    addEventHandlersToCanvas(): void;
    removeEventHandlersFromCanvas(): void;
    resetCamera(): void;
    onPickObject(event: MouseEvent): void;
    private handleTimeChange;
    private dispatchUpdatedTime;
    stopAnimate(): void;
    animate(): void;
    render(): JSX.Element;
}
export default Viewport;
