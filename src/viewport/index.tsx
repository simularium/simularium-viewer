import * as React from 'react';
import jsLogger from 'js-logger';

import { VisGeometry, VisData, SimParameters, NetConnection, DevGUI } from "./agentsim";

interface AgentSimController {
    // NOTE: these can be typed in the future, but they may change signifantly and I dont want to at the moment. -MMRM
    simParameters: any;
    visData: any;
    netConnection: any;
}

interface ViewportProps {
    height: number;
    width: number;
    devgui: boolean;
    loggerLevel: string;
    agentSimController: AgentSimController;
}


class Viewport extends React.Component<ViewportProps> {
    // NOTE: this can be typed in the future, but they may change signifantly and I dont want to at the moment. -MMRM
    private visGeometry: any;
    private lastRenderTime: number;
    private vdomRef: React.RefObject<HTMLInputElement>;

    public static defaultProps = {
        height: 800,
        width: 800,
        devgui: false,
    }

    constructor(props: ViewportProps) {
        super(props);

        const loggerLevel = props.loggerLevel === 'debug' ? jsLogger.DEBUG : jsLogger.OFF;
        const {
            agentSimController,
        } = this.props;

        this.visGeometry = new VisGeometry(loggerLevel);
        this.animate = this.animate.bind(this);
        this.visGeometry.setupScene();
        this.visGeometry.createMaterials(agentSimController.visData.colors);
        this.visGeometry.createMeshes(5000);
        this.vdomRef = React.createRef();
        this.lastRenderTime = Date.now();
    }

    componentDidMount() {
        const {
            agentSimController,
        } = this.props;
        this.visGeometry.reparent(this.vdomRef.current);
        agentSimController.netConnection.connect();
        setInterval(agentSimController.netConnection.checkForUpdates.bind(agentSimController.netConnection), 1000);
    }


    animate() {
        const {
            agentSimController
        } = this.props;
        const {
            simParameters,
            netConnection,
            visData,
        } = agentSimController;
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
            agentSimController,
            width,
            height,
        } = this.props;

        const {
            simParameters,
            netConnection,
            visData,
        } = agentSimController;
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
