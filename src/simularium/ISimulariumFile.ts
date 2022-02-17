import type { TrajectoryFileInfo, VisDataFrame } from "./types";

export default interface ISimulariumFile {
    getTrajectoryFileInfo(): TrajectoryFileInfo;
    getNumFrames(): number;
    getFrameIndexAtTime(time: number): number;
    getFrame(theFrameNumber: number): VisDataFrame | ArrayBuffer;
}
