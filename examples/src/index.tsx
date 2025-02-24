import React from "react";
import { createRoot } from "react-dom/client";

import Viewer from "./Viewer";

const container: HTMLElement | null = document.getElementById("root");

const root = createRoot(container!);
root.render(<Viewer localBackendServer={SIMULARIUM_USE_LOCAL_BACKEND} />);
