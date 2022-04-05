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
    nAgents = 3;
    agentSubpoints: number[][] = [];
    agentPositions: number[][] = [];

    constructor() {
        this.currentFrame = 0;
        this.setupAgents();
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

    private setupAgents() {
        this.nAgents = 3;
        this.agentSubpoints = [];
        this.agentPositions = [
            [-0.5, 0, 0],
            [0, 0, 0],
            [0.5, 0, 0],
        ];
        for (let i = 0; i < this.nAgents; ++i) {
            // one agent:
            // make 8 points within a certain box with given radii
            const subpts = [];
            for (let i = 0; i < 8; ++i) {
                // position
                // coordinates in object space???
                // world space??
                // they will have to be converted to 0-1 space for metaball creation/voxelization
                subpts.push(...this.randomPtInBox(0, 0.25, 0, 0.25, 0, 0.25));
                //                subpts.push(...this.randomPtInBox(-2, 2, -2, 2, -2, 2));
                // radius
                subpts.push(this.randomFloat(0.2, 0.25));
            }
            this.agentSubpoints.push(subpts);
        }
    }

    public update(_dt: number): VisDataMessage {
        // fill agent data.
        const agentData: number[] = [];
        const nAgents = 3;
        for (let ii = 0; ii < nAgents; ++ii) {
            const subpts = this.agentSubpoints[ii];
            for (let i = 0; i < 8; ++i) {
                // give some small delta to the position and radius of each subpoint
                // xyz position
                subpts[i * 4 + 0] += this.randomFloat(-0.01, 0.01);
                subpts[i * 4 + 1] += this.randomFloat(-0.01, 0.01);
                subpts[i * 4 + 2] += this.randomFloat(-0.01, 0.01);
                // radius update
                subpts[i * 4 + 3] += this.randomFloat(-0.01, 0.01);
            }
            agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // vis type
            agentData.push(ii); // instance id
            agentData.push(ii); // type
            agentData.push(...this.agentPositions[ii]); // x,y,z
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
        const colors = ["ffffff", "ff0000", "00aaff"];
        for (let i = 0; i < colors.length; ++i) {
            typeMapping[i] = {
                name: `metaball${i}`,
                geometry: {
                    url: "",
                    displayType: GeometryDisplayType.METABALLS,
                    color: colors[i],
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
                x: 2,
                y: 2,
                z: 2,
            },
            cameraDefault: {
                position: {
                    x: 0,
                    y: 0,
                    z: -3.4,
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
