import * as React from 'react';
interface Viewport {
    visGeometry: any;
    lastRenderTime: any;
    vdomRef: any;
}
interface ViewportProps {
    height: number;
    width: number;
    devgui: any;
    timeStepSliderVal: number;
    lastTimeStepSliderVal: number;
    minimumTimeStep: number;
    maximumTimeStep: number;
    timeStepSliderExponent: number;
    preRunNumTimeSteps: number;
    preRunTimeStep: number;
    trajectoryPlaybackFile: string;
    cachePlaybackFrame: number;
    serverPort: string;
    serverIp: string;
    loggerLevel: string;
    netConnection: any;
    visData: any;
    simParameters: any;
}
declare class Viewport extends React.Component<ViewportProps> {
    static defaultProps: {
        height: number;
        width: number;
        devgui: boolean;
    };
    constructor(props: ViewportProps);
    componentDidMount(): void;
    animate(): void;
    render(): JSX.Element;
}
export default Viewport;
