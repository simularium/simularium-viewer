import { IClientSimulatorImpl, ClientMessageEnum } from "../../../src/simularium/localSimulators/IClientSimulatorImpl";
import { EncodedTypeMapping, TrajectoryFileInfo, VisDataMessage } from "../../../src/simularium/types";
import VisTypes from "../../../src/simularium/VisTypes";
import { DEFAULT_CAMERA_SPEC } from "../../../src/constants";

export default class PointSim implements IClientSimulatorImpl {
    nPoints: number;
    pointsData: number[];
    currentFrame: number;
    nTypes: number;

    constructor(nPoints: number, nTypes: number) {
        this.nPoints = nPoints;
        this.nTypes = nTypes;
        this.pointsData = this.makePoints(nPoints);
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
        return [this.randomFloat(xmin, xmax), this.randomFloat(ymin, ymax), this.randomFloat(zmin, zmax)];
    }

    private makePoints(nPoints) {
        const pts: number[] = [];
        let p: number[] = [];
        for (let i = 0; i < nPoints; ++i) {
            p = this.randomPtInBox(-4, 4, -4, 4, -4, 4);
            pts.push(p[0]);
            pts.push(p[1]);
            pts.push(p[2]);
        }
        return pts;
    }

    public update(_dt: number): VisDataMessage {
        //const dt_adjusted = dt / 1000;
        const amplitude = 0.05;
        for (let ii = 0; ii < this.nPoints; ++ii) {
            this.pointsData[ii * 3 + 0] += this.randomFloat(-amplitude, amplitude);
            this.pointsData[ii * 3 + 1] += this.randomFloat(-amplitude, amplitude);
            this.pointsData[ii * 3 + 2] += this.randomFloat(-amplitude, amplitude);
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
            agentData.push(0.1); // collision radius
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
        const typeMapping: EncodedTypeMapping = {};
        for (let i = 0; i < this.nTypes; ++i) {
            typeMapping[i] = { name: `point${i}` };
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
                x: 12,
                y: 12,
                z: 12,
            },
            cameraDefault: DEFAULT_CAMERA_SPEC,
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

    updateSimulationState(data: Record<string, unknown>) {}
}
