import ReactDOM from "react-dom";
import React from "react";

import AgentVizViewer from '../dist';
import './style.css';
ReactDOM.render(
    <AgentVizViewer 
        height={600}
        width={600}
        devgui={true}
    />,
    document.getElementById("root")
);