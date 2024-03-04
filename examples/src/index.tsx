import React from "react";
import { createRoot } from "react-dom/client";

import Viewer from './Viewer';

declare const SIMULARIUM_USE_OCTOPUS: boolean;
declare const SIMULARIUM_USE_LOCAL_BACKEND: boolean;

const container: HTMLElement | null = document.getElementById("root");

const root = createRoot(container!);
root.render(
    <Viewer
        useOctopus={SIMULARIUM_USE_OCTOPUS}
        localBackendServer={SIMULARIUM_USE_LOCAL_BACKEND}
    />
);
