import { GeometryDisplayType } from "../visGeometry/types";
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
export interface Coordinates3d {
    x: number;
    y: number;
    z: number;
}
export interface PerspectiveCameraSpec {
    position: Coordinates3d;
    lookAtPosition: Coordinates3d;
    upVector: Coordinates3d;
    fovDegrees: number;
}
export declare type CameraSpec = PerspectiveCameraSpec & ({
    orthographic: false;
} | {
    orthographic: true;
    zoom: number;
});
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
    xaxis: {
        title: string;
    };
    yaxis: {
        title: string;
    };
}
export interface Plot {
    data: ScatterTrace[] | HistogramTrace[];
    layout?: Layout;
}
declare type CachedObservables = Plot[];
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
    cameraDefault: PerspectiveCameraSpec;
}
export interface ModelInfo {
    authors?: string;
    description?: string;
    doi?: string;
    inputDataUrl?: string;
    rawOutputDataUrl?: string;
    sourceCodeLicenseUrl?: string;
    sourceCodeUrl?: string;
    title?: string;
    version?: string;
}
export interface TrajectoryFileInfoV3 extends TrajectoryFileInfoV2 {
    modelInfo?: ModelInfo;
    trajectoryTitle?: string;
}
export declare type TrajectoryFileInfoAny = TrajectoryFileInfoV1 | TrajectoryFileInfoV2;
export declare type TrajectoryFileInfo = TrajectoryFileInfoV3;
export interface SimulariumFileFormat {
    trajectoryInfo: TrajectoryFileInfo;
    spatialData: VisDataMessage;
    plotData: CachedObservables;
}
export declare const FILE_STATUS_SUCCESS = "success";
export declare const FILE_STATUS_FAIL = "fail";
declare type FileStatusSuccess = typeof FILE_STATUS_SUCCESS;
declare type FileStatusFail = typeof FILE_STATUS_FAIL;
export declare type FileStatus = FileStatusSuccess | FileStatusFail;
export interface FileReturn {
    status: FileStatus;
    message?: string;
}
export declare const AGENT_OBJECT_KEYS: string[];
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
export {};
