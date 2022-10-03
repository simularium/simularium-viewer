import type { ISimulariumFile } from "./simularium/ISimulariumFile";
export declare const compareTimes: (time1: number, time2: number, timeStepSize: number, stepSizeFraction?: number) => number;
export declare const checkAndSanitizePath: (pathOrUrl: string) => string;
export declare function getFileExtension(pathOrUrl: string): string;
export declare function loadSimulariumFile(file: Blob): Promise<ISimulariumFile>;
