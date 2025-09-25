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
        // vole-core uses a worker imported via local import (e.g. new
        // URL('./local-worker.js', import.meta.url)). If vite bundles the worker,
        // vole-core will not be able to find it at runtime. We exclude vole-core
        // from dependency optimization here.
        exclude: ["@aics/vole-core"],
        // Have to still optimize all CommonJS dependencies of vole-core. See
        // https://vite.dev/config/dep-optimization-options#optimizedeps-exclude
        include: [
            "@aics/vole-core > tweakpane",
            "@aics/vole-core > geotiff",
            "@aics/vole-core > numcodecs",
            "@aics/vole-core > throttled-queue",
        ],
    },
    server: {
        open: "examples/src/index.html",
        port: 8080,
        fs: {
            allow: [".."],
        },
    },
} satisfies UserConfig;
