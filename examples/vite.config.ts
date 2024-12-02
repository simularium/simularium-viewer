import type { UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { searchForWorkspaceRoot } from "vite";

export default {
    root: "src",
    plugins: [react()],
    define: {
        SIMULARIUM_USE_LOCAL_BACKEND: "false",
    },
    server: {
        fs: {
            strict: false,
        },
        open: "examples/src/index.html",
    },
} satisfies UserConfig;
