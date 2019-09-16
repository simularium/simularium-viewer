import React from "react";

import AgentVizViewer, { AgentSimController } from '../dist';
import './style.css';


const netConnectionSettings = {
    serverIp: "52.15.70.94",
    serverPort: 9002,
}

interface ViewerState {
    highlightId: number;
    pauseOn: number;
    particleTypeIds: string[];
    currentFrame: number;
    currentTime: number;   
}

const agentSim = new AgentSimController(netConnectionSettings, { trajectoryPlaybackFile: "actin5-1.h5" })
let currentFrame = 0;
let currentTime = 0;



const intialState = {
    highlightId: -1,
    pauseOn: -1,
    particleTypeIds: [],
    currentFrame: 0,
    currentTime: 0,
}



class Viewer extends React.Component<{}, ViewerState> {
    constructor(props) {
        super(props)
        this.handleJsonMeshData = this.handleJsonMeshData.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.playOneFrame = this.playOneFrame.bind(this);
        this.highlightParticleType = this.highlightParticleType.bind(this);
        this.state = intialState;
    }

    handleJsonMeshData(jsonData) {
        this.setState({particleTypeIds: Object.keys(jsonData)})
    }

    handleTimeChange(timeData){
        currentFrame = timeData.frameNumber;
        currentTime = timeData.time;
        console.log('changed time', this.state.pauseOn, currentFrame)
        this.setState({ currentFrame, currentTime })
        if (this.state.pauseOn === currentFrame) {
            agentSim.pause()
            this.setState({ pauseOn: -1})
        }
    }

    highlightParticleType(typeId) {
        this.setState({highlightId: typeId})
    }

    playOneFrame() {
        const frame = Number(document.querySelector('#frame-number').value);
        agentSim.playFromCache(frame);

        this.setState({pauseOn: frame + 1})
    }

    render() {

        return (<React.Fragment>
            <button
                onClick={() => agentSim.start()}
            >Start</button>
            <button
                onClick={() => agentSim.pause()}
            >Pause</button>
            <button
                onClick={() => agentSim.playFromCache(currentFrame)}
            >Play from cache</button>
            <button
                onClick={() => agentSim.stop()}
            >stop</button>
            <button
                onClick={() => agentSim.changeFile('microtubules15.h5')}
            >
                microtubules file
                </button>
            <button
                onClick={() => agentSim.changeFile('actin5-1.h5')}
            >
                actin file
                </button>
            <input id="frame-number" type="text" />
            <button
                onClick={this.playOneFrame}
            >
                Play one frame
                </button>

            <select
                onChange={(event) => this.highlightParticleType(event.target.value)}
            >
                <option value="-1">None</option>
                {this.state.particleTypeIds.map((id, i) => {
                    return (<option key={id} value={id}>{id}</option>);
                })}
            </select>
            <AgentVizViewer
                height={600}
                width={600}
                devgui={false}
                loggerLevel="debug"
                onTimeChange={this.handleTimeChange}
                agentSimController={agentSim}
                onJsonDataArrived={this.handleJsonMeshData}
                highlightedParticleType={this.state.highlightId}
            />
        </React.Fragment>)
    }
}

export default Viewer;
