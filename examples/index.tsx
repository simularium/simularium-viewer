import ReactDOM from "react-dom";
import React from "react";

import AgentVizViewer from '../dist';
import './style.css';
ReactDOM.render(
    <AgentVizViewer 
        height={600}
        width={600}
        devgui={true}
        serverIp="52.15.70.94"
        trajectoryPlaybackFile="actin5-1.h5"
        loggerLevel="debug"
    />,
    document.getElementById("root")
);