import {
    AGENT_OBJECT_KEYS,
    AgentData,
    CameraSpec,
    PerspectiveCameraSpec,
} from "./simularium/types";

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

export const nullAgent = (): AgentData => {
    return {
        visType: -1,
        instanceId: -1,
        type: -1,
        x: 0,
        y: 0,
        z: 0,
        xrot: 0,
        yrot: 0,
        zrot: 0,
        cr: 0,
        subpoints: [],
    };
};

// the size of the header before the agent data in the binary file
export const AGENT_HEADER_SIZE = 3; // frameNumber, time, agentCount

export const BYTE_SIZE_64_BIT_NUM = 8;
export const BYTES_PER_AGENT = BYTE_SIZE_64_BIT_NUM * AGENT_OBJECT_KEYS.length;
