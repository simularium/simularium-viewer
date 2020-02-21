import React from "react";

import AgentVizViewer, { AgentSimController } from '../dist';
import './style.css';
import { CLIENT_RENEG_WINDOW } from "tls";

const netConnectionSettings = {
    serverIp: "staging-node1-agentviz-backend.cellexplore.net",
    serverPort: 9002
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
    timeStep: number;
    totalDuration: number;
}

const agentSim = new AgentSimController(netConnectionSettings, { trajectoryPlaybackFile: "ATPsynthase_9.h5" })
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
    timeStep: 1,
    totalDuration: 100,
}

const changeFile = (file: string) => () => agentSim.changeFile(file);

class Viewer extends React.Component<{}, ViewerState> {
    private viewerRef: React.RefObject<AgentVizViewer>;

    constructor(props) {
        super(props)
        this.viewerRef = React.createRef();
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
        this.state.totalDuration = data.totalDuration;
        this.state.timeStep = data.timeStepSize;

        currentTime = 0;
        currentFrame = 0;
    }

    handleScrubTime(event) {
        agentSim.gotoTime(event.target.value);
    }

    gotoNextFrame() {
        agentSim.gotoTime(currentTime + this.state.timeStep + 1e-9);
    }

    gotoPreviousFrame() {
        agentSim.gotoTime(currentTime - this.state.timeStep - 1e-9);
    }

    render() {
        return (<div className="container" style={{height: '90%', width: '75%'}}>
            <button onClick={() => agentSim.start()} >Start</button>
            <button onClick={() => agentSim.pause()} >Pause</button>
            <button onClick={() => agentSim.resume()} >Resume</button>
            <button onClick={() => agentSim.stop()} >stop</button>
            <button onClick={changeFile('aster.cmo')}>Aster</button>
            <button onClick={changeFile('actin34_0.h5')}>Actin 34</button>
            <button onClick={changeFile('microtubules30_1.h5')}>MT 30</button>
            <button onClick={changeFile('ATPsynthase_1.h5')}>ATP 1</button>
            <button onClick={changeFile('ATPsynthase_2.h5')}>ATP 2</button>
            <button onClick={changeFile('ATPsynthase_3.h5')}>ATP 3</button>
            <button onClick={changeFile('ATPsynthase_4.h5')}>ATP 4</button>
            <button onClick={changeFile('ATPsynthase_5.h5')}>ATP 5</button>
            <button onClick={changeFile('ATPsynthase_6.h5')}>ATP 6</button>
            <button onClick={changeFile('ATPsynthase_7.h5')}>ATP 7</button>
            <button onClick={changeFile('ATPsynthase_8.h5')}>ATP 8</button>
            <button onClick={changeFile('ATPsynthase_9.h5')}>ATP 9</button>
            <button onClick={changeFile('ATPsynthase_10.h5')}>ATP 10</button>
            <br/>
            <input type="range"
                min="0"
                value={currentTime}
                max={this.state.totalDuration}
                onChange={this.handleScrubTime} />
            <button onClick={this.gotoNextFrame.bind(this)}>Next Frame</button>
            <button onClick={this.gotoPreviousFrame.bind(this)}>Previous Frame</button>
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
            <button
                onClick={() => this.viewerRef.current.resetCamera()}
            >ResetCamera</button>

            <AgentVizViewer
                ref={this.viewerRef}
                height={this.state.height}
                width={this.state.width}
                devgui={false}
                loggerLevel="debug"
                onTimeChange={this.handleTimeChange.bind(this)}
                agentSimController={agentSim}
                onJsonDataArrived={this.handleJsonMeshData}
                onTrajectoryFileInfoChanged={this.handleTrajectoryInfo.bind(this)}
                highlightedParticleType={this.state.highlightId}
                loadInitialData={true}
                showMeshes={this.state.showMeshes}
                showPaths={this.state.showPaths}
            />
        </div>)
    }
}

export default Viewer;
