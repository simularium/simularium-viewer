import { CameraSpec, PerspectiveCameraSpec } from "./simularium/types";

export const DEFAULT_CAMERA_Z_POSITION = 120;
export const DEFAULT_CAMERA_SPEC_PERSPECTIVE: PerspectiveCameraSpec = {
    position: {
        x: 0,
        y: 0,
        z: DEFAULT_CAMERA_Z_POSITION,
    },
    lookAtPosition: {
        x: 0,
        y: 0,
        z: 0,
    },
    upVector: {
        x: 0,
        y: 1,
        z: 0,
    },
    fovDegrees: 75,
};
export const DEFAULT_CAMERA_SPEC: CameraSpec = {
    ...DEFAULT_CAMERA_SPEC_PERSPECTIVE,
    orthographic: false,
};

export const enum TrajectoryType {
    SMOLDYN = "Smoldyn",
}

export const DEFAULT_FRAME_RATE = 60; // frames per second

export const MAX_CACHE_LENGTH = 2000;
