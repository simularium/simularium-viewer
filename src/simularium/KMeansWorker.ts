import * as Comlink from "comlink";

import KMeans3d from "./rendering/KMeans3d";

const obj = {
    run(k, data) {
        const km3 = new KMeans3d({ k: k, data: data });
        return km3.means;
    },
};
export type KMeansWorker = typeof obj;

Comlink.expose(obj);
