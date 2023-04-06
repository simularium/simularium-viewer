import ReactDOM from "react-dom";
import React from "react";

import Viewer from './Viewer';

ReactDOM.render(
        <Viewer useOctopus={SIMULARIUM_USE_OCTOPUS} localBackendServer={SIMULARIUM_USE_LOCAL_BACKEND}/>,
    document.getElementById("root")
);
