import type { UserConfig } from "vite";
import react from "@vitejs/plugin-react";

export default {
    plugins: [react()],
    define: {
        SIMULARIUM_USE_LOCAL_BACKEND: "false",
    },
    server: {
        open: "examples/src/index.html",
        port: 8080,
    },
} satisfies UserConfig;
