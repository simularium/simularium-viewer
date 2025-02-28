import {
    IClientSimulatorImpl,
    ClientMessageEnum,
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
    VisTypes,
    DEFAULT_CAMERA_SPEC,
} from "@aics/simularium-viewer";

export default class CurveSim implements IClientSimulatorImpl {
    nCurves: number;
    curveData: number[];
    nPointsPerCurve: number;
    currentFrame: number;
    nTypes: number;

    constructor(nCurves: number, nTypes: number) {
        this.nCurves = nCurves;
        this.nTypes = nTypes;
        this.nPointsPerCurve = 5;
        this.curveData = this.makeCurveBundle(nCurves, this.nPointsPerCurve);
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
        const nFloatsPerCurve = this.nPointsPerCurve * 3;
        //const dt_adjusted = dt / 1000;
        const amplitude = 0.05;
        for (let ii = 0; ii < this.nCurves; ++ii) {
            for (let jj = 0; jj < this.nPointsPerCurve; ++jj) {
                this.curveData[ii * nFloatsPerCurve + jj * 3 + 0] +=
                    this.randomFloat(-amplitude, amplitude);
                this.curveData[ii * nFloatsPerCurve + jj * 3 + 1] +=
                    this.randomFloat(-amplitude, amplitude);
                this.curveData[ii * nFloatsPerCurve + jj * 3 + 2] +=
                    this.randomFloat(-amplitude, amplitude);
            }
        }
        // fill agent data.
        const agentData: number[] = [];
        for (let ii = 0; ii < this.nCurves; ++ii) {
            agentData.push(VisTypes.ID_VIS_TYPE_FIBER); // vis type
            agentData.push(ii); // instance id
            agentData.push(ii % this.nTypes); // type
            agentData.push(0); // x
            agentData.push(0); // y
            agentData.push(0); // z
            agentData.push(0); // rx
            agentData.push(0); // ry
            agentData.push(0); // rz
            agentData.push(0.1); // collision radius
            agentData.push(nFloatsPerCurve);
            for (let jj = 0; jj < nFloatsPerCurve; ++jj) {
                agentData.push(this.curveData[ii * nFloatsPerCurve + jj]);
            }
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
        for (let i = 0; i < this.nTypes; ++i) {
            typeMapping[i] = { name: `fiber${i}` };
        }
        return {
            // TODO get msgType and connId out of here
            connId: "hello world",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: Infinity,
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
