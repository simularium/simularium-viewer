import { CameraSpec } from "./simularium/types";

export const DEFAULT_CAMERA_Z_POSITION = 120;
export const DEFAULT_CAMERA_SPEC: CameraSpec = {
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
    orthographic: false,
};

export const enum TrajectoryType {
    SMOLDYN = "Smoldyn",
}
