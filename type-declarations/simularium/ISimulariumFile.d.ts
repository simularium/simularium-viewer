import type { Plot, TrajectoryFileInfo, VisDataFrame } from "./types";
export interface ISimulariumFile {
    getTrajectoryFileInfo(): TrajectoryFileInfo;
    getPlotData(): Plot[];
    getNumFrames(): number;
    getFrameIndexAtTime(time: number): number;
    getFrame(theFrameNumber: number): VisDataFrame | ArrayBuffer;
    getAsBlob(): Blob;
}
