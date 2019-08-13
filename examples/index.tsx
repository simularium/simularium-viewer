import ReactDOM from "react-dom";
import React from "react";

import AgentVizViewer, { AgentSimController } from  '../dist';
import './style.css';


const netConnectionSettings = {
    serverIp: "52.15.70.94",
    serverPort: 9002,
}

const agentSim = new AgentSimController(netConnectionSettings, { trajectoryPlaybackFile: "actin5-1.h5" })
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
        <AgentVizViewer 
            height={600}
            width={600}
            devgui={false}
            loggerLevel="debug"
            visData={agentSim.visData}
            simParameters={agentSim.simParameters}
            netConnection={agentSim.netConnection}

        />
    </React.Fragment>,
    document.getElementById("root")
);