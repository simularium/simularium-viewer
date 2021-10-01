import "regenerator-runtime/runtime";
import * as Comlink from "comlink";

import KMeans3d from "../VisGeometry/rendering/KMeans3d";

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

// I know of no other way to deal with this, see the documentation for webpack's worker-loader.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default self as any;
