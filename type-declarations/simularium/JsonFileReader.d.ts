import type { ISimulariumFile } from "./ISimulariumFile";
import type { Plot, SimulariumFileFormat, TrajectoryFileInfo, VisDataFrame } from "./types";
export default class JsonFileReader implements ISimulariumFile {
    simulariumFile: SimulariumFileFormat;
    constructor(fileContents: SimulariumFileFormat);
    getTrajectoryFileInfo(): TrajectoryFileInfo;
    getNumFrames(): number;
    getFrameIndexAtTime(time: number): number;
    getFrame(theFrameNumber: number): VisDataFrame;
    getPlotData(): Plot[];
    getAsBlob(): Blob;
}
