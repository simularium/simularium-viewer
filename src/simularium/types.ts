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

export interface TrajectoryFileInfo {
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

export interface SimulariumFileFormat {
    trajectoryInfo: TrajectoryFileInfo;
    spatialData: VisDataMessage;
    plotData: CachedObservables;
}

export const FILE_STATUS_SUCCESS = "success";
type FileStatusSuccess = typeof FILE_STATUS_SUCCESS;

export type FileStatus = FileStatusSuccess;

export interface FileReturn {
    status: FileStatus;
    message?: string;
}
