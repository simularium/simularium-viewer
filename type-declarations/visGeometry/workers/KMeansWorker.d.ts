declare class KMeansWorker {
    run(k: any, sizes: any, data: any): Promise<Float32Array<ArrayBufferLike>[]>;
}
export type KMeansWorkerType = typeof KMeansWorker;
export {};
