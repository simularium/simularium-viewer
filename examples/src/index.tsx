import ReactDOM from "react-dom";
import React from "react";

import Viewer from './Viewer';

declare const SIMULARIUM_USE_OCTOPUS: boolean;
declare const SIMULARIUM_USE_LOCAL_BACKEND: boolean;

ReactDOM.render(
        <Viewer useOctopus={SIMULARIUM_USE_OCTOPUS} localBackendServer={SIMULARIUM_USE_LOCAL_BACKEND}/>,
    document.getElementById("root")
);
