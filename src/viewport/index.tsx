import React from 'react';

import { VisGeometry, VisData, SimParameters, NetConnection, DevGUI } from "./AgentSimLib.js";

// interface Viewport {
//     visGeometry: any;
//     visData: any;
//     simParameters: any;
//     netConnection: any;
//     devGUI: any;
//     devGuiRef: any;
//     vdomRef: any;
//     lastRenderTime: any;
//     animate: any;
// }

interface ViewportProps {
    height: number;
    width: number;
    devgui: any;
}

class Viewport extends React.Component<ViewportProps> {
    public static defaultProps = {
        height: 800,
        width: 800,
        devgui: false,
    }

    constructor(props: ViewportProps) {
        super(props);
  
        this.visGeometry = new VisGeometry();
        this.visData = new VisData();
        this.simParameters = new SimParameters();
        this.netConnection = new NetConnection(this.simParameters, this.visData);
        this.devGUI = new DevGUI(this.simParameters);

        setInterval(this.netConnection.checkForUpdates.bind(this.netConnection), 1000);
        setInterval(this.devGUI.updateParameters.bind(this.devGUI), 1000);

        this.devGUI.setupGUI(this.visData, this.netConnection, this.simParameters);

        this.visGeometry.setupScene();
        this.visGeometry.createMaterials(this.visData.colors);
        this.visGeometry.createMeshes(5000);

        this.devGuiRef = React.createRef();
        this.vdomRef = React.createRef();

        this.lastRenderTime = Date.now();
        this.animate = () => {
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
    }

    componentDidMount() {
        this.devGUI.reparent(this.devGuiRef.current);
        this.visGeometry.reparent(this.vdomRef.current);
    }

    drawDevGui() {
        const { 
            devgui,
        } = this.props;
        let style = {
            position: "relative" as "relative",
            height: 0,
            overflow: "visible" as "visible",
        };
        return devgui && (<div style={style} ref={this.devGuiRef} />);

    }

    render() {
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
                {this.drawDevGui()}
            </div>
        );
    }
}

export default Viewport;
