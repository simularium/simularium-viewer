import {
    IClientSimulatorImpl,
    ClientMessageEnum,
} from "../src/simularium/localSimulators/IClientSimulatorImpl";
import {
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
} from "../src/simularium/types";
import VisTypes from "../src/simularium/VisTypes";
import { DEFAULT_CAMERA_SPEC } from "../src/constants";
import { GeometryDisplayType } from "../src/visGeometry/types";

export default class MetaballSimulator implements IClientSimulatorImpl {
    currentFrame: number;

    constructor() {
        this.currentFrame = 0;
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

    private makeCurveBundle(nCurves, nPts) {
        const curves: number[] = [];
        let p: number[];
        if (nPts === 3) {
            for (let i = 0; i < nCurves; ++i) {
                p = this.randomSpherePoint(0, 0, 0, 4.0);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomSpherePoint(0, 0, 0, 0.25);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomSpherePoint(0, 0, 0, 2.0);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
            }
        } else if (nPts === 5) {
            for (let i = 0; i < nCurves; ++i) {
                p = this.randomPtInBox(-4, -3, -2, 2, -2, 2);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(-2.5, -2, -1, 1, -1, 1);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(-1, 1, -0.5, 0.5, -0.5, 0.5);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(2, 2.5, -1, 1, -1, 1);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(3, 4, -2, 2, -2, 2);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
            }
        }
        return curves;
    }

    public update(_dt: number): VisDataMessage {
        // fill agent data.
        const agentData: number[] = [];
        const nAgents = 1;
        for (let ii = 0; ii < nAgents; ++ii) {
            // one agent:
            // make 8 points within a certain box with given radii
            const subpts = [];
            for (let i = 0; i < 8; ++i) {
                // position
                // coordinates in object space???
                // world space??
                // they will have to be converted to 0-1 space for metaball creation/voxelization
                subpts.push(...this.randomPtInBox(0, 1, 0, 1, 0, 1));
                //                subpts.push(...this.randomPtInBox(-2, 2, -2, 2, -2, 2));
                // radius
                subpts.push(this.randomFloat(0, 0.5));
            }
            agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // vis type
            agentData.push(ii); // instance id
            agentData.push(ii); // type
            agentData.push(0); // x
            agentData.push(0); // y
            agentData.push(0); // z
            agentData.push(0); // rx
            agentData.push(0); // ry
            agentData.push(0); // rz
            agentData.push(1.0); // collision radius
            agentData.push(subpts.length);
            agentData.push(...subpts);
        }
        const frameData: VisDataMessage = {
            // TODO get msgType and connId out of here
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
        const typeMapping: EncodedTypeMapping = {};
        for (let i = 0; i < 1; ++i) {
            typeMapping[i] = {
                name: `metaball${i}`,
                geometry: {
                    url: "",
                    displayType: GeometryDisplayType.METABALLS,
                    color: "ffffff",
                },
            };
        }
        return {
            // TODO get msgType and connId out of here
            connId: "hello world",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: 1,
            // bounding volume dimensions
            size: {
                x: 2,
                y: 2,
                z: 2,
            },
            cameraDefault: {
                position: {
                    x: 0,
                    y: 0,
                    z: -3.6,
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
