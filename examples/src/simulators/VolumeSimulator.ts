import { GeometryDisplayType } from "@aics/simularium-viewer";
import { createVolumeLoader, LoadSpec } from "@aics/vole-core";
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

const NUM_TIMESTEPS = 120;

const VOLUME_URL =
    "https://s3.us-west-2.amazonaws.com/production.files.allencell.org/982/70e/0ba/ecd/e7a/06a/e41/de6/29a/1af/30/3500007062_20250207_20X_Timelapse-01(P17-G3).ome.zarr";

const FOV_DEGREES = 75;
const DEGREES_TO_RADIANS = 3.14159265 / 180.0;

const volumeAgentData = (time: number): number[] => [
    // AGENT 1 ("volume")
    VisTypes.ID_VIS_TYPE_DEFAULT, // vis type - TODO swap to volume when/if available
    0, // instance id
    0, // type
    0, // x
    0, // y
    0, // time * 0.3, // z
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

// spheres to test volume-mesh intersection. Each has its own type so that it
// can have its own color, and they all oscillate along z, out of phase.
const SPHERES = [
    { name: "sphere", color: "ff0000", x: -3 },
    { name: "sphere 2", color: "00ff00", x: -1 },
    { name: "sphere 3", color: "0080ff", x: 1 },
    { name: "sphere 4", color: "ff8000", x: 3 },
];
// agent type ids for the spheres start after the volume's type (0)
const SPHERE_TYPE_OFFSET = 1;

const sphereAgentData = (time: number, index: number): number[] => [
    VisTypes.ID_VIS_TYPE_DEFAULT, // vis type
    index + 1, // instance id
    index + SPHERE_TYPE_OFFSET, // type
    SPHERES[index].x, // x
    0, // y
    3 * Math.sin(time / 10 + (index * 2 * Math.PI) / SPHERES.length), //z
    0, // rx
    0, // ry
    0, // rz
    1.0, // time / 2 + 5, // collision radius
    0, // subpoints
];

export default class VolumeSim implements IClientSimulatorImpl {
    size: [number, number, number];
    curFrame: number = 0;
    // number of timepoints in the volume; 1 until the volume's dims are loaded
    volumeSizeT: number = 1;

    constructor() {
        this.size = [25, 25, 25];
        this.loadVolumeSizeT();
    }

    private async loadVolumeSizeT(): Promise<void> {
        try {
            const loader = await createVolumeLoader(VOLUME_URL);
            const dims = await loader.loadDims(new LoadSpec());
            this.volumeSizeT = Math.max(1, dims[0].shape[0]);
        } catch (e) {
            console.error("Failed to load volume dims", e);
        }
    }

    update(requestedTime?: number): VisDataMessage {
        if (requestedTime === undefined) {
            this.curFrame = Math.min(this.curFrame + 1, NUM_TIMESTEPS - 1);
        } else {
            this.curFrame = Math.max(
                0,
                Math.min(NUM_TIMESTEPS - 1, Math.round(requestedTime))
            );
        }
        return {
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.curFrame,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: [
                        ...volumeAgentData(this.curFrame % this.volumeSizeT),
                        ...SPHERES.flatMap((_, i) =>
                            sphereAgentData(this.curFrame, i)
                        ),
                    ],
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
                    url: VOLUME_URL,
                    color: "ffff00",
                },
            },
        };
        SPHERES.forEach(({ name, color }, i) => {
            typeMapping[i + SPHERE_TYPE_OFFSET] = {
                name,
                geometry: {
                    displayType: GeometryDisplayType.SPHERE,
                    url: "",
                    color,
                },
            };
        });

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
