import * as React from 'react';
import jsLogger from 'js-logger';

import { VisGeometry, VisData, SimParameters, NetConnection, DevGUI } from "./AgentSimLib";

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
    minimumTimeStep : number;
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


class Viewport extends React.Component<ViewportProps> {
    public static defaultProps = {
        height: 800,
        width: 800,
        devgui: false,
    }



    constructor(props: ViewportProps) {
        super(props);

        const loggerLevel = props.loggerLevel === 'debug' ? jsLogger.DEBUG : jsLogger.OFF;
        this.visGeometry = new VisGeometry(loggerLevel);
        this.animate = this.animate.bind(this);
        this.visGeometry.setupScene();
        this.visGeometry.createMaterials(this.props.visData.colors);
        this.visGeometry.createMeshes(5000);
        this.vdomRef = React.createRef();
        this.lastRenderTime = Date.now();
    }

    componentDidMount() {
        const { netConnection } = this.props;
        this.visGeometry.reparent(this.vdomRef.current);
        netConnection.connect();
        setInterval(netConnection.checkForUpdates.bind(netConnection), 1000);
    }


    animate() {
        const {
            simParameters,
            netConnection,
            visData,
        } = this.props;
        const framesPerSecond = 15; // how often the view-port rendering is refreshed per second
        const timePerFrame = 1000 / framesPerSecond; // the time interval at which to re-render
        const elapsedTime = Date.now() - this.lastRenderTime;
        if (elapsedTime > timePerFrame) {
            if (!netConnection.socketIsValid()) {
                this.visGeometry.clear();
            }

            if (simParameters.newSimulationIsRunning) {
                this.visGeometry.mapFromJSON(
                    `https://aics-agentviz-data.s3.us-east-2.amazonaws.com/visdata/${simParameters.trajectoryPlaybackFile}.json`,
                );
                simParameters.newSimulationIsRunning = false;
            }

            this.visGeometry.render();
            this.lastRenderTime = Date.now();
        }

        if (visData.hasNewData()) {
            this.visGeometry.colorVariant = visData.colorVariant;
            this.visGeometry.update(visData.agents);
            visData.newDataHasBeenHandled();
        }

        requestAnimationFrame(this.animate);
    };

    render() {
        const {
            devgui,
            simParameters,
            visData,
            netConnection,
            width,
            height,
        } = this.props;

        this.animate();

        // style is specified below so that the size
        // can be passed as a react property
        return (<div 
                id="vdom"
                style={
                    { 
                        height: height,
                        width: width,
                    }
                }
                ref={this.vdomRef}
            >
                {devgui && (<DevGUI 
                                simParams={simParameters}
                                visData={visData}
                                netConnection={netConnection}
                            />)}
            </div>
        );
    }
}

export default Viewport;
