import { GeometryDisplayType } from "../../../src";
import {
    IClientSimulatorImpl,
    ClientMessageEnum,
} from "../../../src/simularium/localSimulators/IClientSimulatorImpl";
import {
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
} from "../../../src/simularium/types";
import VisTypes from "../../../src/simularium/VisTypes";

const NUM_TIMESTEPS = 5;

const FOV_DEGREES = 75;
const DEGREES_TO_RADIANS = 3.14159265 / 180.0;

const volumeAgentData = (time: number): number[] => [
    // AGENT 1 ("volume")
    VisTypes.ID_VIS_TYPE_DEFAULT, // vis type - TODO swap to volume when/if available
    0, // instance id
    0, // type
    0, // x
    0, // y
    time * 0.3, // z
    0, // rx
    0, // ry
    0, // rz
    10.0, // collision radius
    4, // subpoints
    time,
    0,
    1,
    2,
];

const sphereAgentData = (time: number): number[] => [
    // AGENT 2 (sphere, to test volume-mesh intersection)
    VisTypes.ID_VIS_TYPE_DEFAULT, // vis type
    1, // instance id
    1, // type
    0, // x
    0, // y
    3, // z
    0, // rx
    0, // ry
    0, // rz
    time / 2 + 5, // collision radius
    0, // subpoints
];

export default class VolumeSim implements IClientSimulatorImpl {
    size = [25, 25, 25];
    time = 0;

    update(t?: number): VisDataMessage {
        this.time = (t ?? this.time + 1) % NUM_TIMESTEPS;
        return {
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.time,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: [
                        ...volumeAgentData(this.time),
                        ...sphereAgentData(this.time),
                    ],
                    frameNumber: this.time,
                    time: this.time,
                },
            ],
            fileName: "hello world",
        };
    }
    getInfo(): TrajectoryFileInfo {
        const typeMapping: EncodedTypeMapping = {
            [0]: {
                name: "volume",
                geometry: {
                    displayType: GeometryDisplayType.VOLUME,
                    url: "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P13-C4.zarr/",
                    color: "ffff00",
                },
            },
            [1]: {
                name: "sphere",
                geometry: {
                    displayType: GeometryDisplayType.SPHERE,
                    url: "",
                    color: "ff0000",
                },
            },
        };

        return {
            // TODO get msgType and connId out of here
            connId: "hello world",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 3,
            timeStepSize: 1,
            totalSteps: NUM_TIMESTEPS,
            size: {
                x: this.size[0],
                y: this.size[1],
                z: this.size[2],
            },
            cameraDefault: {
                position: {
                    x: 0,
                    y: 0,
                    // set a z value that will roughly frame the bounding box within our camera field of view
                    z:
                        Math.sqrt(
                            this.size[0] * this.size[0] +
                                this.size[1] * this.size[1] +
                                this.size[2] * this.size[2]
                        ) / Math.tan(0.5 * FOV_DEGREES * DEGREES_TO_RADIANS),
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
                fovDegrees: FOV_DEGREES,
            },
            typeMapping,
            spatialUnits: {
                magnitude: 1,
                name: "m",
            },
            timeUnits: {
                magnitude: 1,
                name: "s",
            },
        };
    }

    updateSimulationState(_data: Record<string, unknown>) {
        // no op
    }
}
