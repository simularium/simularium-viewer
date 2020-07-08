import "regenerator-runtime/runtime";
//import * as Comlink from "comlink";

import KMeans3d from "../rendering/KMeans3d";

//const obj = {
export class KMeansWorker {
    async run(k, data) {
        //console.log("START PROCESSING KMEANS");

        const sizes: number[] = [
            Math.max(Math.floor(k / 8), 1),
            Math.max(Math.floor(k / 32), 1),
            Math.max(Math.floor(k / 128), 1),
        ];

        const results: Float32Array[] = [];
        for (let i = 0; i < sizes.length; ++i) {
            const km3 = new KMeans3d({ k: sizes[i], data: data });
            results.push(km3.means);
            //console.log("Processed LOD " + i);
        }
        console.log("FINISHED PROCESSING KMEANS");
        return results;
    }
}
//};
//export type KMeansWorkerType = typeof obj;

//Comlink.expose(obj);
