import "regenerator-runtime/runtime";
declare class KMeansWorker {
    run(k: any, sizes: any, data: any): Promise<Float32Array[]>;
}
export declare type KMeansWorkerType = typeof KMeansWorker;
export {};
