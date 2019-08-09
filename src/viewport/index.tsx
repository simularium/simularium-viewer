import * as React from 'react';
import jsLogger from 'js-logger';

import { VisGeometry, VisData, SimParameters, NetConnection, DevGUI } from "./AgentSimLib.js";

interface Viewport {
    visGeometry: any;
    visData: any;
    simParameters: any;
    netConnection: any;
    devGUI: any;
    lastRenderTime: any;
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
}


class Viewport extends React.Component<ViewportProps> {
    public static defaultProps = {
        height: 800,
        width: 800,
        devgui: false,
    }



    constructor(props: ViewportProps) {
        super(props);
        const simParameters = {
            timeStepSliderVal: props.timeStepSliderVal,
            lastTimeStepSliderVal: props.lastTimeStepSliderVal,
            minimumTimeStep: props.minimumTimeStep,
            maximumTimeStep: props.maximumTimeStep,
            timeStepSliderExponent: props.timeStepSliderExponent,
            preRunNumTimeSteps: props.preRunNumTimeSteps,
            preRunTimeStep: props.preRunTimeStep,
            trajectoryPlaybackFile: props.trajectoryPlaybackFile,
            cachePlaybackFrame: props.cachePlaybackFrame,         
        }

        const netConnection = {
            serverIp: props.serverIp,
            serverPort: props.serverPort,
        }
        const loggerLevel = props.loggerLevel === 'debug' ? jsLogger.DEBUG : jsLogger.OFF;

        this.animate = this.animate.bind(this);

        this.visGeometry = new VisGeometry(loggerLevel);
        this.visData = new VisData(loggerLevel);
        this.simParameters = new SimParameters(simParameters);
        this.netConnection = new NetConnection(this.simParameters, this.visData, netConnection, loggerLevel);

        setInterval(this.netConnection.checkForUpdates.bind(this.netConnection), 1000);

        this.visGeometry.setupScene();
        this.visGeometry.createMaterials(this.visData.colors);
        this.visGeometry.createMeshes(5000);
        this.vdomRef = React.createRef();
        this.lastRenderTime = Date.now();
    }

    componentDidMount() {
        this.visGeometry.reparent(this.vdomRef.current);
        this.netConnection.connect();
    }


    animate() {
        const framesPerSecond = 15; // how often the view-port rendering is refreshed per second
        const timePerFrame = 1000 / framesPerSecond; // the time interval at which to re-render
        const elapsedTime = Date.now() - this.lastRenderTime;
        if (elapsedTime > timePerFrame) {
            if (!this.netConnection.socketIsValid()) {
                this.visGeometry.clear();
            }

            if (this.simParameters.newSimulationIsRunning) {
                this.visGeometry.mapFromJSON(
                    `https://aics-agentviz-data.s3.us-east-2.amazonaws.com/visdata/${this.simParameters.trajectoryPlaybackFile}.json`,
                );
                this.simParameters.newSimulationIsRunning = false;
            }

            this.visGeometry.render();
            this.lastRenderTime = Date.now();
        }

        if (this.visData.hasNewData()) {
            this.visGeometry.colorVariant = this.visData.colorVariant;
            this.visGeometry.update(this.visData.agents);
            this.visData.newDataHasBeenHandled();
        }

        requestAnimationFrame(this.animate);
    };

    render() {
        const {
            devgui,
        } = this.props;

        this.animate();

        // style is specified below so that the size
        // can be passed as a react property
        return (<div 
                id="vdom"
                style={
                    { 
                        height:this.props.height,
                        width:this.props.width,
                    }
                }
                ref={this.vdomRef}
            >
                {devgui && (<DevGUI 
                                simParams={this.simParameters}
                                visData={this.visData}
                                netConnection={this.netConnection}
                            />)}
            </div>
        );
    }
}

export default Viewport;
