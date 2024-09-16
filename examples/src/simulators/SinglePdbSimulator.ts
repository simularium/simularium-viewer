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
import { GeometryDisplayType } from "../../../src/visGeometry/types";

export default class PdbSim implements IClientSimulatorImpl {
    pdbType: string;
    size: [number, number, number];
    agentdata: number[];

    constructor(pdbType: string) {
        this.pdbType = pdbType;
        this.size = [25, 25, 25];
        // 11 is the number of numbers for each agent
        this.agentdata = new Array(11);
    }

    public update(_dt: number): VisDataMessage {
        // fill agent data.

        this.agentdata[0] = VisTypes.ID_VIS_TYPE_DEFAULT; // vis type
        this.agentdata[1] = 0; // instance id
        this.agentdata[2] = 0; // type
        this.agentdata[3] = 0; // x
        this.agentdata[4] = 0; // y
        this.agentdata[5] = 0; // z
        this.agentdata[6] = 0; // rx
        this.agentdata[7] = 0; // ry
        this.agentdata[8] = 0; // rz
        this.agentdata[9] = 1.0; // collision radius
        this.agentdata[10] = 0; // subpoints
        const frameData: VisDataMessage = {
            // TODO get msgType out of here
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: 0,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: this.agentdata,
                    frameNumber: 0,
                    time: 0,
                },
            ],
            fileName: "hello world",
        };
        return frameData;
    }

    public getInfo(): TrajectoryFileInfo {
        const typeMapping: EncodedTypeMapping = {
            [0]: {
                name: this.pdbType,
                geometry: {
                    displayType: GeometryDisplayType.PDB,
                    url: this.pdbType,
                    color: "ffffff",
                },
            },
        };
        const FOV_DEGREES = 75;
        const DEGREES_TO_RADIANS = 3.14159265 / 180.0;
        return {
            // TODO get msgType and connId out of here
            connId: "hello world",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: 1,
            // bounding volume dimensions
            size: {
                x: this.size[0],
                y: this.size[1],
                z: this.size[2],
            },
            cameraDefault: {
                position: {
                    x: 0,
                    y: 0,
                    z:
                        // set a z value that will roughly frame the bounding box within our camera field of view
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
            typeMapping: typeMapping,
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

    updateSimulationState(data: Record<string, unknown>) {
        // no op
    }
}
