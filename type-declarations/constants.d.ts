import { AgentData, CameraSpec, PerspectiveCameraSpec } from "./simularium/types";
export declare const DEFAULT_CAMERA_Z_POSITION = 120;
export declare const DEFAULT_CAMERA_SPEC_PERSPECTIVE: PerspectiveCameraSpec;
export declare const DEFAULT_CAMERA_SPEC: CameraSpec;
export declare const enum TrajectoryType {
    SMOLDYN = "Smoldyn"
}
export declare const DEFAULT_FRAME_RATE = 60;
export declare const nullAgent: () => AgentData;
export declare const AGENT_HEADER_SIZE = 3;
export declare const BYTE_SIZE_64_BIT_NUM = 8;
