import type {
    Plot,
    SimulariumFileFormat,
    TrajectoryFileInfo,
    VisDataFrame,
    VisDataMessage,
} from "./types";

export interface ISimulariumFile {
    getTrajectoryFileInfo(): TrajectoryFileInfo;
    getPlotData(): Plot[];
    getNumFrames(): number;
    getFrameIndexAtTime(time: number): number;
    getFrame(theFrameNumber: number): VisDataFrame | ArrayBuffer;
    getSpatialData(): VisDataMessage | DataView;
    getFullFile(): SimulariumFileFormat | ArrayBuffer;
}
