import React from "react";

import AgentVizViewer, { AgentSimController } from '../dist';
import './style.css';
import { CLIENT_RENEG_WINDOW } from "tls";

// The agentsim component relies on a web-socket connection
//  this version of the config will attempt to connect to the
//  provided settings on startup
// const netConnectionSettings = {
//     serverIp: "52.15.70.94",
//     serverPort: 9002,
// }

// The agentsim component relies on a web-socket connection
//  this version of the config will request information about a
//  valid remote server from a service hosted at the address
//  provided below
// const netConnectionSettingsIpService = {
//     useIpService: true,
//     ipServiceAddr: "http://a70fd6193bee611e9907a06c21ce3c1b-732404489.us-east-2.elb.amazonaws.com/"
// }

// could be a prop
const useIpService = false;

const netConnectionSettings = {
    useIpService,
    serverIp: "staging-node1-agentviz-backend.cellexplore.net",
    serverPort: 9002,
    ipServiceAddr: null,
}

interface ViewerState {
    highlightId: number;
    pauseOn: number;
    particleTypeIds: string[];
    currentFrame: number;
    currentTime: number;
    height: number;
    width: number;
    showMeshes: boolean;
    showPaths: boolean;
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
    height: 800,
    width: 800,
    showMeshes: true,
    showPaths: true,
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

    componentDidMount() {
        window.addEventListener('resize', () => {
            const container = document.querySelector('.container');

            const height = container.clientHeight;
            const width = container.clientWidth;
            this.setState({ height, width })
        })
    }

    handleJsonMeshData(jsonData) {
        this.setState({particleTypeIds: Object.keys(jsonData)})
    }

    handleTimeChange(timeData){
        currentFrame = timeData.frameNumber;
        currentTime = timeData.time;
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
        agentSim.playFromFrame(frame);

        this.setState({pauseOn: frame + 1})
    }

    handleTrajectoryInfo(data) {
        console.log('Trajectory info arrived', data);
    }

    render() {
        return (<div className="container" style={{height: '90%', width: '75%'}}>
            <button
                onClick={() => agentSim.start()}
            >Start</button>
            <button
                onClick={() => agentSim.pause()}
            >Pause</button>
            <button
                onClick={() => agentSim.playFromFrame(currentFrame)}
            >Play from cache</button>
            <button
                onClick={() => agentSim.stop()}
            >stop</button>
            <button
                onClick={() => agentSim.changeFile('microtubules19.h5')}
            >microtubules file</button>
            <button
                onClick={() => agentSim.changeFile('actin19.h5')}
            >
                actin file
            </button>
            <br/>
            <input id="frame-number" type="text" />
            <button
                onClick={() => agentSim.gotoNextFrame()}
            >Next Frame</button>
            <button
                onClick={() => agentSim.gotoPreviousFrame()}
            >Previous Frame</button>
            <button
                onClick={this.playOneFrame}
            >
                Play one frame
            </button>
            <button
                onClick={() => agentSim.playFromTime(0)}
            >
                Play from time 0ns
            </button>
            <br/>
            <select
                onChange={(event) => this.highlightParticleType(event.target.value)}
            >
                <option value="-1">None</option>
                {this.state.particleTypeIds.map((id, i) => {
                    return (<option key={id} value={id}>{id}</option>);
                })}
            </select>
            <button
                onClick={() => this.setState({showMeshes: !this.state.showMeshes})}
            >ShowMeshes</button>
            <button
                onClick={() => this.setState({showPaths: !this.state.showPaths})}
            >ShowPaths</button>

            <AgentVizViewer
                height={this.state.height}
                width={this.state.width}
                devgui={false}
                loggerLevel="debug"
                onTimeChange={this.handleTimeChange}
                agentSimController={agentSim}
                onJsonDataArrived={this.handleJsonMeshData}
                onTrajectoryFileInfoChanged={this.handleTrajectoryInfo}
                highlightedParticleType={this.state.highlightId}
                loadInitialData={false}
                showMeshes={this.state.showMeshes}
                showPaths={this.state.showPaths}
            />
        </div>)
    }
}

export default Viewer;
