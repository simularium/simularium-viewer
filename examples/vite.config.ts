import type { UserConfig } from "vite";
import react from "@vitejs/plugin-react";

export default {
    plugins: [react()],
    define: {
        SIMULARIUM_USE_LOCAL_BACKEND: Boolean(
            process.env.npm_config_localserver || false
        ),
    },
    resolve: {
        dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
        include: ["@aics/simularium-viewer"],
    },
    server: {
        open: "/",
        port: 8080,
    },
} satisfies UserConfig;