import * as React from 'react';
import AgentSimController from '../controller';
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
declare class Viewport extends React.Component<ViewportProps> {
    private visGeometry;
    private lastRenderTime;
    private vdomRef;
    private handlers;
    private hit;
    private raycaster;
    private animationRequestID;
    static defaultProps: {
        height: number;
        width: number;
        devgui: boolean;
        highlightedParticleType: number;
        loadInitialData: boolean;
        showMeshes: boolean;
        showPaths: boolean;
    };
    private static isCustomEvent;
    constructor(props: ViewportProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: ViewportProps): void;
    addEventHandlersToCanvas(): void;
    removeEventHandlersFromCanvas(): void;
    onPickObject(event: MouseEvent): void;
    private handleTimeChange;
    private dispatchUpdatedTime;
    stopAnimate(): void;
    animate(): void;
    render(): JSX.Element;
}
export default Viewport;
