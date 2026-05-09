import {
    IClientSimulatorImpl,
    ClientMessageEnum,
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
    VisTypes,
    DEFAULT_CAMERA_SPEC,
} from "@aics/simularium-viewer";

/**
 * A small demo simulator that emits per-agent features so colormaps can be
 * tested. Each agent has 2 features:
 *   0: distance from origin (changes via the random-walk position update)
 *   1: a smooth oscillation in [0,1] with a per-agent phase, so it varies
 *      gradually over time.
 */
export default class PointFeatureSimulator implements IClientSimulatorImpl {
    nPoints: number;
    pointsData: number[];
    /** per-agent phase offset for the oscillating feature, in radians */
    phase: number[];
    currentFrame: number;
    nTypes: number;

    constructor(nPoints: number, nTypes: number) {
        this.nPoints = nPoints;
        this.nTypes = nTypes;
        this.pointsData = [];
        this.phase = [];
        for (let i = 0; i < nPoints; ++i) {
            this.pointsData.push(this.rand(-4, 4));
            this.pointsData.push(this.rand(-4, 4));
            this.pointsData.push(this.rand(-4, 4));
            this.phase.push(Math.random() * Math.PI * 2);
        }
        this.currentFrame = 0;
    }

    private rand(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    public update(_dt: number): VisDataMessage {
        const amplitude = 0.05;
        for (let ii = 0; ii < this.nPoints; ++ii) {
            this.pointsData[ii * 3 + 0] += this.rand(-amplitude, amplitude);
            this.pointsData[ii * 3 + 1] += this.rand(-amplitude, amplitude);
            this.pointsData[ii * 3 + 2] += this.rand(-amplitude, amplitude);
        }
        // Smoothly varying oscillation feature in [0,1]. Period ~250 frames.
        const t = (this.currentFrame * (Math.PI * 2)) / 250;
        const agentData: number[] = [];
        for (let ii = 0; ii < this.nPoints; ++ii) {
            const x = this.pointsData[ii * 3 + 0];
            const y = this.pointsData[ii * 3 + 1];
            const z = this.pointsData[ii * 3 + 2];
            const distance = Math.sqrt(x * x + y * y + z * z);
            const oscillation = 0.5 + 0.5 * Math.sin(t + this.phase[ii]);

            agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // vis type
            agentData.push(ii); // instance id
            agentData.push(ii % this.nTypes); // type
            agentData.push(x);
            agentData.push(y);
            agentData.push(z);
            agentData.push(0); // rx
            agentData.push(0); // ry
            agentData.push(0); // rz
            agentData.push(0.5); // collision radius
            agentData.push(0); // nSubpoints
            // 2 features: distance and an oscillating value.
            agentData.push(2);
            agentData.push(distance);
            agentData.push(oscillation);
        }
        const frameData: VisDataMessage = {
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.currentFrame,
            bundleSize: 1,
            bundleData: [
                {
                    data: agentData,
                    frameNumber: this.currentFrame,
                    time: this.currentFrame,
                },
            ],
            fileName: "point-feature-demo",
        };
        this.currentFrame++;
        return frameData;
    }

    public getInfo(): TrajectoryFileInfo {
        const typeMapping: EncodedTypeMapping = {};
        for (let i = 0; i < this.nTypes; ++i) {
            // Type 0 ships with a built-in viridis colormap on feature 0
            // (distance). Other types are solid by default; the example UI
            // can toggle additional colormaps at runtime.
            const entry: EncodedTypeMapping[number] = {
                name: `point${i}`,
                geometry: {
                    displayType: undefined as unknown as never,
                    featureNames: ["distance", "oscillation"],
                },
            };
            if (i === 0) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                entry.geometry!.colormap = {
                    name: "viridis",
                    featureIndex: 0,
                    min: 0,
                    max: 8,
                };
            }
            typeMapping[i] = entry;
        }
        return {
            connId: "point-feature-demo",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 4,
            timeStepSize: 1,
            totalSteps: 1000,
            size: { x: 12, y: 12, z: 12 },
            cameraDefault: DEFAULT_CAMERA_SPEC,
            typeMapping: typeMapping,
            spatialUnits: { magnitude: 1, name: "m" },
            timeUnits: { magnitude: 1, name: "s" },
        };
    }

    public updateSimulationState(_data: Record<string, unknown>): void {
        // no-op
    }
}
