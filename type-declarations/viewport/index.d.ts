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
}
interface TimeData {
    time: number;
    frameNumber: number;
}
declare class Viewport extends React.Component<ViewportProps> {
    private visGeometry;
    private lastRenderTime;
    private vdomRef;
    static defaultProps: {
        height: number;
        width: number;
        devgui: boolean;
    };
    private static isCustomEvent;
    constructor(props: ViewportProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    private handleTimeChange;
    private dispatchUpdatedTime;
    animate(): void;
    render(): JSX.Element;
}
export default Viewport;
