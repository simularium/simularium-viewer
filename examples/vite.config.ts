import type { UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default {
    plugins: [react()],
    define: {
        SIMULARIUM_USE_LOCAL_BACKEND: Boolean(
            process.env.npm_config_localserver || false
        ),
    },
    resolve: {
        dedupe: ["react", "react-dom"],
        alias: {
            "@aics/simularium-viewer": path.resolve(__dirname, "..", "es"),
        },
    },
    optimizeDeps: {
        include: [],
    },
    server: {
        open: "examples/src/index.html",
        port: 8080,
        fs: {
            allow: [".."],
        },
    },
} satisfies UserConfig;
