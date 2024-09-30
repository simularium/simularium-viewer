import "regenerator-runtime/runtime";
declare class KMeansWorker {
    run(k: any, sizes: any, data: any): Promise<Float32Array[]>;
}
export type KMeansWorkerType = typeof KMeansWorker;
export {};
