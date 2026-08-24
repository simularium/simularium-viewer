import { readFileSync } from "node:fs";
import type { Plugin, UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const itkPipelineDirectory = path.resolve(
    __dirname,
    "../node_modules/@itk-wasm/mesh-io/dist/pipelines"
);
const itkWorkerDirectory = path.resolve(
    __dirname,
    "../node_modules/itk-wasm/dist/pipeline/web-workers/bundles"
);
const itkAssets = [
    {
        name: "vtk-poly-data-read-mesh.js",
        source: path.join(itkPipelineDirectory, "vtk-poly-data-read-mesh.js"),
    },
    {
        name: "vtk-poly-data-read-mesh.wasm.zst",
        source: path.join(
            itkPipelineDirectory,
            "vtk-poly-data-read-mesh.wasm.zst"
        ),
    },
    {
        name: "itk-wasm-pipeline.worker.js",
        source: path.join(itkWorkerDirectory, "itk-wasm-pipeline.worker.js"),
    },
] as const;

const itkPipelineAssets = (): Plugin => ({
    name: "itk-vtk-pipeline-assets",
    configureServer(server) {
        server.middlewares.use("/itk-pipelines", (request, response, next) => {
            const assetName = request.url?.split("?", 1)[0].replace(/^\/+/, "");
            const asset = itkAssets.find((item) => item.name === assetName);
            if (!asset) {
                next();
                return;
            }
            response.setHeader(
                "Content-Type",
                assetName.endsWith(".js")
                    ? "text/javascript"
                    : "application/octet-stream"
            );
            response.end(readFileSync(asset.source));
        });
    },
    generateBundle() {
        for (const asset of itkAssets) {
            this.emitFile({
                type: "asset",
                fileName: `itk-pipelines/${asset.name}`,
                source: readFileSync(asset.source),
            });
        }
    },
});

export default {
    plugins: [react(), itkPipelineAssets()],
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
        open: "/src/index.html",
        port: 8080,
        fs: {
            allow: [".."],
        },
    },
} satisfies UserConfig;
