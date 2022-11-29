import "regenerator-runtime/runtime";
import * as Comlink from "comlink";

import KMeans3d from "../rendering/KMeans3d";

class KMeansWorker {
    async run(k, sizes, data) {
        const results: Float32Array[] = [];
        for (let i = 0; i < sizes.length; ++i) {
            const km3 = new KMeans3d({ k: sizes[i], data: data });
            results.push(km3.means);
        }
        return results;
    }
}

export type KMeansWorkerType = typeof KMeansWorker;

Comlink.expose(KMeansWorker);
