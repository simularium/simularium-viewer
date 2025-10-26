import { GeometryDisplayType } from "@aics/simularium-viewer";
import "@aics/vole-core/es/workers/VolumeLoadWorker.js";
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
    agentdata: number[];
    size: [number, number, number];
    curFrame: number = 0;

    constructor() {
        this.agentdata = [
            // AGENT 1 ("volume")
            VisTypes.ID_VIS_TYPE_DEFAULT, // vis type - TODO swap to volume when/if available
            0, // instance id
            0, // type
            0, // x
            0, // y
            0, // z
            0, // rx
            0, // ry
            0, // rz
            10.0, // collision radius
            4, // subpoints
            0,
            0,
            1,
            2,

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
            1.0, // collision radius
            0, // subpoints
        ];
        this.size = [25, 25, 25];
    }

    updateAgentPos(agentIndex: number, x: number, y: number, z: number) {
        const OFFSET_TO_FIRST_AGENT = 15;
        const baseIndex = OFFSET_TO_FIRST_AGENT + agentIndex * 11;
        this.agentdata[baseIndex + 3] = x;
        this.agentdata[baseIndex + 4] = y;
        this.agentdata[baseIndex + 5] = z;
    }
    updateVolumeT(t: number) {
        this.agentdata[11] = t;
    }

    update(_dt: number): VisDataMessage {
        this.updateAgentPos(0, 0, 0, 3 * Math.sin(this.curFrame / 10));
        this.updateVolumeT(this.curFrame);
        this.curFrame++;
        // cycle 200 frames
        this.curFrame = this.curFrame % 200;
        return {
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.time,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: this.agentdata,
                    frameNumber: this.curFrame,
                    time: this.curFrame, // in seconds
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
                    url: "https://s3.us-west-2.amazonaws.com/production.files.allencell.org/982/70e/0ba/ecd/e7a/06a/e41/de6/29a/1af/30/3500007062_20250207_20X_Timelapse-01(P17-G3).ome.zarr",
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
