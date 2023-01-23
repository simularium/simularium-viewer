import { GeometryDisplayType } from "../visGeometry/types";

export interface VisDataFrame {
    data: number[];
    frameNumber: number;
    time: number;
}

// TODO: see proposed new NetMessage data type
//       Remove msgType and fileName from this data structure
//       Then this data structure appears as a payload of the NetMessage
export interface VisDataMessage {
    msgType: number;
    bundleStart: number;
    bundleSize: number;
    bundleData: VisDataFrame[];
    fileName: string;
}

interface Coordinates3d {
    x: number;
    y: number;
    z: number;
}

export interface CameraSpec {
    position: Coordinates3d;
    lookAtPosition: Coordinates3d;
    upVector: Coordinates3d;
    fovDegrees: number;
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

export interface Plot {
    data: ScatterTrace[] | HistogramTrace[];
    layout?: Layout;
}

type CachedObservables = Plot[];

export interface AgentTypeVisData {
    displayType: GeometryDisplayType;
    url: string;
    color: string;
}

export interface AgentDisplayDataWithGeometry {
    name: string;
    geometry: AgentTypeVisData;
}

export interface AgentDisplayData {
    name: string;
    geometry?: AgentTypeVisData;
}

export interface EncodedTypeMapping {
    [key: number]: AgentDisplayData;
}

// TODO: see proposed new NetMessage data type
//       Remove msgType and connId from this data structure.
//       Then this data structure appears as a payload of the NetMessage
interface TrajectoryFileInfoBase {
    connId: string;
    msgType: number;
    readonly version: number;
    timeStepSize: number;
    totalSteps: number;
    size: Coordinates3d;
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
    cameraDefault: CameraSpec;
}

export type TrajectoryFileInfoAny = TrajectoryFileInfoV1 | TrajectoryFileInfoV2;

// This should always point to the latest version
export type TrajectoryFileInfo = TrajectoryFileInfoV2;

export interface SimulariumFileFormat {
    trajectoryInfo: TrajectoryFileInfo;
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

// IMPORTANT: Order of this array needs to perfectly match the incoming data.
export const AGENT_OBJECT_KEYS = [
    // TODO: convert "vis-type" to visType at parse time
    "vis-type",
    "instanceId",
    "type",
    "x",
    "y",
    "z",
    "xrot",
    "yrot",
    "zrot",
    "cr",
    "nSubPoints",
];

/**
 * Parse Agents from Net Data
 * */
export interface AgentData {
    x: number;
    y: number;
    z: number;
    xrot: number;
    yrot: number;
    zrot: number;
    instanceId: number;
    ["vis-type"]: number;
    type: number;
    cr: number;
    subpoints: number[];
}

export interface FrameData {
    frameNumber: number;
    time: number;
}

export interface PlotConfig {
    plotType: string;
    metricsIdx: number;
    metricsIdy?: number;
    scatterPlotMode?: string;
}
