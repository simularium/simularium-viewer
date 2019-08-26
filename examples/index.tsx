import ReactDOM from "react-dom";
import React from "react";

import AgentVizViewer, { AgentSimController } from  '../dist';
import './style.css';


const netConnectionSettings = {
    serverIp: "52.15.70.94",
    serverPort: 9002,
}

const agentSim = new AgentSimController(netConnectionSettings, { trajectoryPlaybackFile: "actin5-1.h5" })

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
                onClick={() => agentSim.playFromCache()}
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
                agentSimController={agentSim}
                onJsonDataArrived={handleJsonMeshData}
                highlightedParticleType={state.highlightId}
            />
        </React.Fragment>,
        document.getElementById("root")
    );
}

renderDemo(demoState);
