import ReactDOM from "react-dom";
import React from "react";

import AgentVizViewer, { AgentSimController } from  '../dist';
import './style.css';


// The agentsim component relies on a web-socket connection
//  this version of the config will attempt to connect to the
//  provided settings on startup
const netConnectionSettings = {
    serverIp: "127.0.0.1",
    serverPort: 9002,
}

// The agentsim component relies on a web-socket connection
//  this version of the config will request information about a
//  valid remote server from a service hosted at the address
//  provided below
const netConnectionSettingsIpService = {
    useIpService: true,
    ipServiceAddr: "http://a70fd6193bee611e9907a06c21ce3c1b-732404489.us-east-2.elb.amazonaws.com/"
}

const agentSim = new AgentSimController(netConnectionSettingsIpService, { trajectoryPlaybackFile: "actin19.h5" })
let currentFrame = 0;
let currentTime = 0;
const handleTimeChange = (timeData) => {
    currentFrame = timeData.frameNumber;
    currentTime = timeData.time;
}

const demoState = {
    highlightId: -1,
    particleTypeIds: []
}

const handleJsonMeshData = (jsonData) => {
    demoState.particleTypeIds = Object.keys(jsonData);
    renderDemo(demoState);
}

function highlightParticleType(typeId) {
    demoState.highlightId = typeId;
    renderDemo(demoState);
}

function renderDemo(state) {
    ReactDOM.render(
        <React.Fragment>
            <button
                onClick={() => agentSim.start()}
            >Start</button>
            <button
                onClick={() => agentSim.pause()}
            >Pause</button>
            <button
                onClick={() => agentSim.playFromFrame(0)}
            >Play from Frame</button>
            <button
                onClick={() => agentSim.playFromTime(25000)}
            >Play from Time</button>
            <button
                onClick={() => agentSim.stop()}
            >stop</button>
            <button
                onClick={() => agentSim.changeFile('microtubules19.h5')}
            >
                microtubules file
            </button>
            <button
                onClick={() => agentSim.changeFile('actin19.h5')}
            >
                actin file
            </button>
            <select
                onChange={(event) => highlightParticleType(event.target.value)}
            >
                <option value="-1">None</option>
                {state.particleTypeIds.map((id, i) => {
                    return (<option value={id}>{id}</option>);
                })}
            </select>
            <AgentVizViewer
                height={600}
                width={600}
                devgui={false}
                loggerLevel="debug"
                onTimeChange={handleTimeChange}
                agentSimController={agentSim}
                onJsonDataArrived={handleJsonMeshData}
                highlightedParticleType={state.highlightId}
            />
        </React.Fragment>,
        document.getElementById("root")
    );
}

renderDemo(demoState);
