import {
    IClientSimulatorImpl,
    ClientMessageEnum,
} from "./IClientSimulatorImpl";
import {
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
} from "../types";
import { GeometryDisplayType } from "../VisGeometry/types";
import VisTypes from "../VisTypes";
import { DEFAULT_CAMERA_SPEC } from "../../constants";

export default class PdbSim implements IClientSimulatorImpl {
    nPoints: number;
    pointsData: number[];
    currentFrame: number;
    nTypes: number;
    size: [number, number, number];

    constructor(nPoints = 4000, nTypes = 4) {
        this.currentFrame = 0;
        this.size = [250, 250, 250];
        this.nPoints = nPoints;
        this.nTypes = nTypes;
        this.pointsData = this.makePoints(nPoints);
    }

    private randomFloat(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    private randomSpherePoint(x0, y0, z0, radius): number[] {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const x = x0 + radius * Math.sin(phi) * Math.cos(theta);
        const y = y0 + radius * Math.sin(phi) * Math.sin(theta);
        const z = z0 + radius * Math.cos(phi);
        return [x, y, z];
    }
    private randomPtInBox(xmin, xmax, ymin, ymax, zmin, zmax) {
        return [
            this.randomFloat(xmin, xmax),
            this.randomFloat(ymin, ymax),
            this.randomFloat(zmin, zmax),
        ];
    }

    private makePoints(nPoints) {
        const pts: number[] = [];
        let p: number[] = [];
        for (let i = 0; i < nPoints; ++i) {
            p = this.randomPtInBox(
                -this.size[0] / 2,
                this.size[0] / 2,
                -this.size[1] / 2,
                this.size[1] / 2,
                -this.size[2] / 2,
                this.size[2] / 2
            );
            pts.push(p[0]);
            pts.push(p[1]);
            pts.push(p[2]);
        }
        return pts;
    }

    public update(_dt: number): VisDataMessage {
        //const dt_adjusted = dt / 1000;
        const amplitude = this.size[0] * 0.05;
        for (let ii = 0; ii < this.nPoints; ++ii) {
            this.pointsData[ii * 3 + 0] += this.randomFloat(
                -amplitude,
                amplitude
            );
            this.pointsData[ii * 3 + 1] += this.randomFloat(
                -amplitude,
                amplitude
            );
            this.pointsData[ii * 3 + 2] += this.randomFloat(
                -amplitude,
                amplitude
            );
        }
        // fill agent data.
        const agentData: number[] = [];
        for (let ii = 0; ii < this.nPoints; ++ii) {
            agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // vis type
            agentData.push(ii); // instance id
            agentData.push(ii % this.nTypes); // type
            agentData.push(this.pointsData[ii * 3 + 0]); // x
            agentData.push(this.pointsData[ii * 3 + 1]); // y
            agentData.push(this.pointsData[ii * 3 + 2]); // z
            agentData.push(0); // rx
            agentData.push(0); // ry
            agentData.push(0); // rz
            agentData.push(1.0); // collision radius
            agentData.push(0); // subpoints
        }
        const frameData: VisDataMessage = {
            // TODO get msgType out of here
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.currentFrame,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: agentData,
                    frameNumber: this.currentFrame,
                    time: this.currentFrame,
                },
            ],
            fileName: "hello world",
        };
        this.currentFrame++;
        return frameData;
    }

    public getInfo(): TrajectoryFileInfo {
        const urls = [
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/actin.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/arp2.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/arp3.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/tubA.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/tubB.pdb",
        ];

        const typeMapping: EncodedTypeMapping = {};
        for (let i = 0; i < this.nTypes; ++i) {
            typeMapping[i] = {
                name: `point${i}`,
                geometry: {
                    displayType: GeometryDisplayType.PDB,
                    url: urls[i % urls.length],
                    color: "ff0000",
                },
            };
        }
        return {
            // TODO get msgType and connId out of here
            connId: "hello world",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: 1000,
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
                        Math.sqrt(
                            this.size[0] * this.size[0] +
                                this.size[1] * this.size[1] +
                                this.size[2] * this.size[2]
                        ) * Math.tan((0.5 * 75 * 3.14159256) / 180.0),
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
}
