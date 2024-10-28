import type { ISimulariumFile } from "./simularium/ISimulariumFile";
import { AgentData, CachedFrame } from "./simularium/types";
export declare const compareTimes: (time1: number, time2: number, timeStepSize: number, stepSizeFraction?: number) => number;
export declare const checkAndSanitizePath: (pathOrUrl: string) => string;
export declare function getFileExtension(pathOrUrl: string): string;
export declare function loadSimulariumFile(file: Blob): Promise<ISimulariumFile>;
export declare const nullCachedFrame: () => CachedFrame;
export declare const getAgentDataFromBuffer: (view: Float32Array, offset: number) => AgentData;
export declare const getNextAgentOffset: (view: Float32Array, currentOffset: number) => number;
