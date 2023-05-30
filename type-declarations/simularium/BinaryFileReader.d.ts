import type { ISimulariumFile } from "./ISimulariumFile";
import type { Plot, TrajectoryFileInfo, VisDataFrame } from "./types";
declare const enum BlockTypeEnum {
    SPATIAL_DATA_JSON = 0,
    TRAJECTORY_INFO_JSON = 1,
    PLOT_DATA_JSON = 2,
    SPATIAL_DATA_BINARY = 3
}
interface BlockInfo {
    type: BlockTypeEnum;
    offset: number;
    size: number;
}
interface Header {
    version: number;
    blocks: BlockInfo[];
}
export default class BinaryFileReader implements ISimulariumFile {
    fileContents: ArrayBuffer;
    dataView: DataView;
    header: Header;
    tfi: TrajectoryFileInfo;
    plotData: Plot[];
    nFrames: number;
    frameOffsets: number[];
    frameLengths: number[];
    spatialDataBlock: DataView;
    constructor(fileContents: ArrayBuffer);
    static isBinarySimulariumFile(fileContents: Blob): Promise<boolean>;
    private readSpatialDataInfo;
    private readHeader;
    private readTrajectoryFileInfo;
    private readPlotData;
    private getBlock;
    private getBlockContent;
    private parseJsonBlock;
    getTrajectoryFileInfo(): TrajectoryFileInfo;
    getNumFrames(): number;
    getFrameIndexAtTime(time: number): number;
    getFrame(theFrameNumber: number): VisDataFrame | ArrayBuffer;
    getPlotData(): Plot[];
    getAsBlob(): Blob;
}
export {};
