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
    constructor(props: ViewportProps);
    componentDidMount(): void;
    handleTimeChange(e: any): void;
    dispatchUpdatedTime(timeData: any): void;
    animate(): void;
    render(): JSX.Element;
}
export default Viewport;
