import {
    IClientSimulatorImpl,
    ClientMessageEnum,
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
    VisTypes,
    GeometryDisplayType,
} from "@aics/simularium-viewer";

export default class PdbSim implements IClientSimulatorImpl {
    nPoints: number;
    pointsData: number[];
    currentFrame: number;
    nTypes: number;
    size: [number, number, number];
    agentdata: number[];

    constructor(nPoints = 16000, nTypes = 4) {
        this.currentFrame = 0;
        this.size = [250, 250, 250];
        this.nPoints = nPoints;
        this.nTypes = nTypes;
        this.pointsData = this.makePoints(nPoints);
        // 11 is the number of numbers for each agent
        this.agentdata = new Array(nPoints * 11);
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

    public update(_dt?: number): VisDataMessage {
        //const dt_adjusted = dt / 1000;
        const amplitude = this.size[0] * 0.01;
        // fill agent data.
        for (let i = 0; i < this.nPoints; ++i) {
            this.pointsData[i * 3 + 0] += this.randomFloat(
                -amplitude,
                amplitude
            );
            this.pointsData[i * 3 + 1] += this.randomFloat(
                -amplitude,
                amplitude
            );
            this.pointsData[i * 3 + 2] += this.randomFloat(
                -amplitude,
                amplitude
            );

            this.agentdata[i * 11 + 0] = VisTypes.ID_VIS_TYPE_DEFAULT; // vis type
            this.agentdata[i * 11 + 1] = i; // instance id
            this.agentdata[i * 11 + 2] = i % this.nTypes; // type
            this.agentdata[i * 11 + 3] = this.pointsData[i * 3 + 0]; // x
            this.agentdata[i * 11 + 4] = this.pointsData[i * 3 + 1]; // y
            this.agentdata[i * 11 + 5] = this.pointsData[i * 3 + 2]; // z
            this.agentdata[i * 11 + 6] = Math.random() * 3.14159265 * 0.5; // rx
            this.agentdata[i * 11 + 7] = Math.random() * 3.14159265 * 0.5; // ry
            this.agentdata[i * 11 + 8] = 0; // rz
            this.agentdata[i * 11 + 9] = 1.0; // collision radius
            this.agentdata[i * 11 + 10] = 0; // subpoints
        }
        const frameData: VisDataMessage = {
            // TODO get msgType out of here
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.currentFrame,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: this.agentdata,
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
            "https://files.rcsb.org/download/4V40.cif",
            "7DAM",
            "7PWD",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/actin.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/arp2.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/arp3.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/tubA.pdb",
            "https://aics-simularium-data.s3.us-east-2.amazonaws.com/meshes/obj/tubB.pdb",
        ];
        const names = [
            "4V40",
            "7DAM",
            "7PWD",
            "actin",
            "arp2",
            "arp3",
            "tubA",
            "tubB",
        ];
        const colors = [
            "ff0000",
            "00ff00",
            "0000ff",
            "ffff00",
            "ff00ff",
            "00ffff",
            "ffffff",
            "888888",
        ];

        const typeMapping: EncodedTypeMapping = {};
        for (let i = 0; i < this.nTypes; ++i) {
            typeMapping[i] = {
                name: names[i % names.length],
                geometry: {
                    displayType: GeometryDisplayType.PDB,
                    url: urls[i % urls.length],
                    color: colors[i % colors.length],
                },
            };
        }
        const FOV_DEGREES = 75;
        const DEGREES_TO_RADIANS = 3.14159265 / 180.0;
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

    updateSimulationState(data: Record<string, unknown>) {}
}
