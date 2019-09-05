import * as React from 'react';
interface AgentSimController {
    simParameters: any;
    visData: any;
    netConnection: any;
}
interface ViewportProps {
    height: number;
    width: number;
    devgui: boolean;
    loggerLevel: string;
    onTimeChange: (timeData: TimeData) => void;
    agentSimController: AgentSimController;
    onJsonDataArrived: any;
    highlightedParticleType: number | string;
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
    };
    private static isCustomEvent;
    constructor(props: ViewportProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
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
