export interface VisDataFrame {
    data: number[];
    frameNumber: number;
    time: number;
}

export interface VisDataMessage {
    msgType: number;
    bundleStart: number;
    bundleSize: number;
    bundleData: VisDataFrame[];
    fileName: string;
}

interface ScatterTrace {
    x: number[];
    y: number[];
    mode: "markers" | "lines" | "lines+markers";
    type: "scatter";
    name?: string;
}
interface HistogramTrace {
    x: number[];
    y: number[];
    type: "histogram";
    name?: string;
}

interface Layout {
    title: string;
    xaxis: { title: string };
    yaxis: { title: string };
}

interface Plot {
    data: ScatterTrace[] | HistogramTrace[];
    layout?: Layout;
}

type CachedObservables = Plot[];

export interface AgentDisplayData {
    name: string;
    pdb?: string;
    mesh?: string;
}
export interface EncodedTypeMapping {
    [key: number]: AgentDisplayData;
}

interface TrajectoryFileInfoBase {
    connId: string;
    msgType: number;
    version: number;
    timeStepSize: number;
    totalSteps: number;
    size: {
        x: number;
        y: number;
        z: number;
    };
    typeMapping: EncodedTypeMapping;
}

export interface TrajectoryFileInfoV1 extends TrajectoryFileInfoBase {
    spatialUnitFactorMeters: number;
}

export interface TrajectoryFileInfoV2 extends TrajectoryFileInfoBase {
    spatialUnits: {
        magnitude: number;
        name: string;
    };
    timeUnits: {
        magnitude: number;
        name: string;
    };
}

export type TrajectoryFileInfoAny = TrajectoryFileInfoV1 | TrajectoryFileInfoV2;

// This should always point to the latest version
export type TrajectoryFileInfo = TrajectoryFileInfoV2;

export interface SimulariumFileFormat {
    trajectoryInfo: TrajectoryFileInfoAny;
    spatialData: VisDataMessage;
    plotData: CachedObservables;
}

export const FILE_STATUS_SUCCESS = "success";
export const FILE_STATUS_FAIL = "fail";

type FileStatusSuccess = typeof FILE_STATUS_SUCCESS;
type FileStatusFail = typeof FILE_STATUS_FAIL;

export type FileStatus = FileStatusSuccess | FileStatusFail;

export interface FileReturn {
    status: FileStatus;
    message?: string;
}
