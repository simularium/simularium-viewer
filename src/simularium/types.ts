import { GeometryDisplayType } from "../visGeometry/types.js";

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

export type CameraSpec = PerspectiveCameraSpec &
    ({ orthographic: false } | { orthographic: true; zoom: number });

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

type PlotData = {
    version: number;
    data: Plot[];
};

/**
 * Built-in colormap names recognized by the viewer.
 * Custom colormaps may be supplied via `stops` instead.
 */
export type ColormapName =
    | "viridis"
    | "plasma"
    | "magma"
    | "inferno"
    | "turbo"
    | "gray";

export type RgbStop = [number, number, number]; // each component in [0,1]

/**
 * Per-agent-type colormap. When present on an AgentTypeVisData,
 * the viewer renders agents of that type using their feature value
 * mapped through the colormap LUT, instead of the solid `color`.
 */
export interface ColormapSpec {
    /** built-in colormap name; ignored if `stops` is provided */
    name?: ColormapName;
    /** explicit RGB stops (each in [0,1]); overrides `name` */
    stops?: RgbStop[];
    /** which entry of agentData.features to sample (default 0) */
    featureIndex: number;
    /** value mapped to colormap position 0.0 */
    min: number;
    /** value mapped to colormap position 1.0 */
    max: number;
}

export interface AgentTypeVisData {
    displayType: GeometryDisplayType;
    url: string;
    color: string;
    /** optional human-readable labels for each entry of agentData.features */
    featureNames?: string[];
    /** if set, agents of this type are rendered via colormap lookup */
    colormap?: ColormapSpec;
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

export type TrajectoryFileInfoAny = TrajectoryFileInfoV1 | TrajectoryFileInfoV2;

// This should always point to the latest version
export type TrajectoryFileInfo = TrajectoryFileInfoV3;

export interface SimulariumFileFormat {
    trajectoryInfo: TrajectoryFileInfo;
    spatialData: VisDataMessage;
    plotData: PlotData;
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
    "visType",
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
    visType: number;
    type: number;
    cr: number;
    subpoints: number[];
    /**
     * Per-agent feature values. Length is per-agent (may be 0).
     * Used in conjunction with AgentTypeVisData.colormap to drive
     * a per-agent color via colormap lookup.
     */
    features: number[];
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

export interface CachedFrame {
    data: ArrayBuffer;
    frameNumber: number;
    time: number;
    agentCount: number;
    size: number;
}

export interface CacheNode {
    data: CachedFrame;
    next: CacheNode | null;
    prev: CacheNode | null;
}

export interface CacheLog {
    size: number;
    framesInCache: number[];
}
