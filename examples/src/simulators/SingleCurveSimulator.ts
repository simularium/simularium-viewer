import {
    IClientSimulatorImpl,
    ClientMessageEnum,
} from "../../../src/simularium/localSimulators/IClientSimulatorImpl.js";
import {
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
} from "../../../src/simularium/types.js";
import VisTypes from "../../../src/simularium/VisTypes.js";
import { DEFAULT_CAMERA_SPEC } from "../../../src/constants.js";

export default class SingleCurveSim implements IClientSimulatorImpl {
    curveData: number[];
    nPointsPerCurve: number;
    currentFrame: number;

    constructor() {
        this.nPointsPerCurve = 5;
        this.curveData = this.makeCurveBundle();
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

    private makeCurveBundle() {
        // make one curve w/5 pts
        const curves: number[] = [];
        let p: number[];
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
        return curves;
    }

    public update(_dt: number): VisDataMessage {
        const nFloatsPerCurve = this.nPointsPerCurve * 3;
        //const dt_adjusted = dt / 1000;
        const amplitude = 0.05;
        for (let jj = 0; jj < this.nPointsPerCurve; ++jj) {
            this.curveData[jj * 3 + 0] += this.randomFloat(
                -amplitude,
                amplitude
            );
            this.curveData[jj * 3 + 1] += this.randomFloat(
                -amplitude,
                amplitude
            );
            this.curveData[jj * 3 + 2] += this.randomFloat(
                -amplitude,
                amplitude
            );
        }
        // fill agent data.
        const agentData: number[] = [];
        agentData.push(VisTypes.ID_VIS_TYPE_FIBER); // vis type
        agentData.push(0); // instance id
        agentData.push(0); // type
        agentData.push(3.0 * Math.sin(this.currentFrame / 50)); // x
        agentData.push(0); // y
        agentData.push(0); // z
        agentData.push(0); // rx
        agentData.push(0); // ry
        agentData.push(this.currentFrame / 50); // rz
        agentData.push(0.3); // collision radius
        agentData.push(nFloatsPerCurve);
        for (let jj = 0; jj < nFloatsPerCurve; ++jj) {
            agentData.push(this.curveData[jj]);
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
        typeMapping[0] = { name: "fiber0" };
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
