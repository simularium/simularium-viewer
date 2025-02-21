import {
    IClientSimulatorImpl,
    ClientMessageEnum,
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
    VisTypes,
    DEFAULT_CAMERA_SPEC,
} from "@aics/simularium-viewer";

interface FiberDefinition {
    // The "current" positions of each subpoint
    subPoints: number[];
    // The "original" (anchor) positions for each subpoint
    originalSubPoints: number[];
    // A random offset for each subpoint (scaled by sin(orbitAngle))
    randomOffsets: number[];
    typeId: number;
    instanceId: number;
}

interface SphereDefinition {
    x: number;
    y: number;
    z: number;
    typeId: number;
    instanceId: number;
}

export default class DebugSimBreathingCube implements IClientSimulatorImpl {
    private currentFrame = 0;
    private orbitAngle = 0;

    private cubeEdges: FiberDefinition[] = [];
    private axisFibers: FiberDefinition[] = [];
    private axisSpheres: SphereDefinition[] = [];
    private orbitingSphere: SphereDefinition;

    private orbitSpeed = 0.05; // how fast the orbiting sphere completes a circle
    private deformationAmplitude = 0.2; // max distance from original positions

    constructor() {
        this.buildCubeEdges();
        this.buildAxisFibersAndSpheres();

        // Orbiting sphere
        this.orbitingSphere = {
            x: 3,
            y: 0,
            z: 0,
            typeId: 5, // orbiting sphere type
            instanceId: 300, // arbitrary ID
        };
    }

    private buildCubeEdges() {
        // corners from [-1, -1, -1] to [1, 1, 1]
        const c1 = [-1, -1, -1];
        const c2 = [-1, -1, +1];
        const c3 = [-1, +1, -1];
        const c4 = [-1, +1, +1];
        const c5 = [+1, -1, -1];
        const c6 = [+1, -1, +1];
        const c7 = [+1, +1, -1];
        const c8 = [+1, +1, +1];

        // each edge = [startCorner, endCorner]
        const edges = [
            [c1, c2],
            [c1, c3],
            [c1, c5],
            [c2, c4],
            [c2, c6],
            [c3, c4],
            [c3, c7],
            [c4, c8],
            [c5, c6],
            [c5, c7],
            [c6, c8],
            [c7, c8],
        ];

        const numEdgeSubPoints = 6; // how many subpoints per edge
        let edgeId = 0;

        edges.forEach(([cornerA, cornerB]) => {
            // generate the "perfect" subpoints
            const originalSubPoints = this.interpolatePoints(
                cornerA,
                cornerB,
                numEdgeSubPoints
            );

            // current subPoints starts as a copy
            const subPoints = originalSubPoints.slice();

            // build random offsets for each subpoint (x,y,z)
            const randomOffsets: number[] = [];
            const totalCoords = numEdgeSubPoints * 3;
            for (let i = 0; i < totalCoords; i += 3) {
                // for each subpoint:
                // - if it's an endpoint (i=0 or i=last), offset is [0,0,0]
                const isFirst = i === 0;
                const isLast = i === totalCoords - 3;
                if (isFirst || isLast) {
                    randomOffsets.push(0, 0, 0);
                } else {
                    // interior points get a random offset
                    randomOffsets.push(
                        this.randomFloat(-1, 1),
                        this.randomFloat(-1, 1),
                        this.randomFloat(-1, 1)
                    );
                }
            }

            this.cubeEdges.push({
                subPoints,
                originalSubPoints,
                randomOffsets,
                typeId: 0, // "CubeFiber"
                instanceId: edgeId,
            });
            edgeId++;
        });
    }

    private buildAxisFibersAndSpheres() {
        const axisExtent = 2;
        const steps = 5;

        // X-axis
        this.axisFibers.push(
            this.buildAxisFiber("x", -axisExtent, axisExtent, steps, 1, 100)
        );
        // Y-axis
        this.axisFibers.push(
            this.buildAxisFiber("y", -axisExtent, axisExtent, steps, 2, 101)
        );
        // Z-axis
        this.axisFibers.push(
            this.buildAxisFiber("z", -axisExtent, axisExtent, steps, 3, 102)
        );

        // Place spheres at endpoints
        const sphereType = 4;
        let sphereInstId = 200;
        // X
        this.axisSpheres.push({
            x: -axisExtent,
            y: 0,
            z: 0,
            typeId: sphereType,
            instanceId: sphereInstId++,
        });
        this.axisSpheres.push({
            x: axisExtent,
            y: 0,
            z: 0,
            typeId: sphereType,
            instanceId: sphereInstId++,
        });
        // Y
        this.axisSpheres.push({
            x: 0,
            y: -axisExtent,
            z: 0,
            typeId: sphereType,
            instanceId: sphereInstId++,
        });
        this.axisSpheres.push({
            x: 0,
            y: axisExtent,
            z: 0,
            typeId: sphereType,
            instanceId: sphereInstId++,
        });
        // Z
        this.axisSpheres.push({
            x: 0,
            y: 0,
            z: -axisExtent,
            typeId: sphereType,
            instanceId: sphereInstId++,
        });
        this.axisSpheres.push({
            x: 0,
            y: 0,
            z: axisExtent,
            typeId: sphereType,
            instanceId: sphereInstId++,
        });
    }

    private buildAxisFiber(
        axis: "x" | "y" | "z",
        negativeEnd: number,
        positiveEnd: number,
        nSteps: number,
        typeId: number,
        instanceId: number
    ): FiberDefinition {
        const originalSubPoints = this.makeAxisSubpoints(
            axis,
            negativeEnd,
            positiveEnd,
            nSteps
        );
        const subPoints = originalSubPoints.slice(); // copy
        const randomOffsets: number[] = [];

        const totalCoords = nSteps * 3;
        for (let i = 0; i < totalCoords; i += 3) {
            const isFirst = i === 0;
            const isLast = i === totalCoords - 3;
            if (isFirst || isLast) {
                randomOffsets.push(0, 0, 0);
            } else {
                randomOffsets.push(
                    this.randomFloat(-1, 1),
                    this.randomFloat(-1, 1),
                    this.randomFloat(-1, 1)
                );
            }
        }

        return {
            subPoints,
            originalSubPoints,
            randomOffsets,
            typeId,
            instanceId,
        };
    }

    private makeAxisSubpoints(
        axis: "x" | "y" | "z",
        negativeEnd: number,
        positiveEnd: number,
        nSteps: number
    ): number[] {
        const result: number[] = [];
        const stepSize = (positiveEnd - negativeEnd) / (nSteps - 1);
        for (let i = 0; i < nSteps; i++) {
            const val = negativeEnd + i * stepSize;
            if (axis === "x") {
                result.push(val, 0, 0);
            } else if (axis === "y") {
                result.push(0, val, 0);
            } else {
                result.push(0, 0, val);
            }
        }
        return result;
    }

    private interpolatePoints(
        start: number[],
        end: number[],
        nPoints: number
    ): number[] {
        const result: number[] = [];
        for (let i = 0; i < nPoints; i++) {
            const t = i / (nPoints - 1);
            const x = start[0] + t * (end[0] - start[0]);
            const y = start[1] + t * (end[1] - start[1]);
            const z = start[2] + t * (end[2] - start[2]);
            result.push(x, y, z);
        }
        return result;
    }

    // ------------------------------------------------------------------------
    // UPDATE: Each frame:
    //   1) Move the orbiting sphere
    //   2) Deform each fiber to a "breathing" shape by:
    //      subPoints[i] = originalSubPoints[i] + randomOffsets[i] * (sin(orbitAngle) * amplitude)
    //   => So each revolution of orbitAngle (2π) returns to original shape.
    // ------------------------------------------------------------------------
    public update(_dt: number): VisDataMessage {
        // 1) Move orbiting sphere
        this.orbitAngle += this.orbitSpeed;
        const radius = 3;
        this.orbitingSphere.x = radius * Math.cos(this.orbitAngle);
        this.orbitingSphere.y = radius * Math.sin(this.orbitAngle);

        // 2) Update the cube edges
        this.updateFiberPoints(this.cubeEdges);

        // 3) Update the axis fibers
        this.updateFiberPoints(this.axisFibers);

        // Construct the agent data
        const agentData: number[] = [];

        // Cube edges
        for (const edge of this.cubeEdges) {
            const nFloats = edge.subPoints.length;
            agentData.push(VisTypes.ID_VIS_TYPE_FIBER);
            agentData.push(edge.instanceId);
            agentData.push(edge.typeId);
            agentData.push(0, 0, 0, 0, 0, 0); // transforms
            agentData.push(0.1); // radius
            agentData.push(nFloats);
            for (let i = 0; i < nFloats; i++) {
                agentData.push(edge.subPoints[i]);
            }
        }

        // Axis fibers
        for (const axisFiber of this.axisFibers) {
            const nFloats = axisFiber.subPoints.length;
            agentData.push(VisTypes.ID_VIS_TYPE_FIBER);
            agentData.push(axisFiber.instanceId);
            agentData.push(axisFiber.typeId);
            agentData.push(0, 0, 0, 0, 0, 0);
            agentData.push(0.1);
            agentData.push(nFloats);
            for (let i = 0; i < nFloats; i++) {
                agentData.push(axisFiber.subPoints[i]);
            }
        }

        // Axis endpoint spheres
        for (const sphere of this.axisSpheres) {
            agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT);
            agentData.push(sphere.instanceId);
            agentData.push(sphere.typeId);
            agentData.push(sphere.x, sphere.y, sphere.z);
            agentData.push(0, 0, 0);
            agentData.push(0.3);
            agentData.push(0);
        }

        // Orbiting sphere
        agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT);
        agentData.push(this.orbitingSphere.instanceId);
        agentData.push(this.orbitingSphere.typeId);
        agentData.push(
            this.orbitingSphere.x,
            this.orbitingSphere.y,
            this.orbitingSphere.z
        );
        agentData.push(0, 0, 0);
        agentData.push(0.4);
        agentData.push(0);

        // Return the frame data
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
            fileName: "debug-breathing-cube",
        };
        this.currentFrame++;
        return frameData;
    }

    // This function applies the "breathing" deformation to each fiber
    private updateFiberPoints(fibers: FiberDefinition[]) {
        const sineVal = Math.sin(this.orbitAngle);
        for (const fiber of fibers) {
            // subPoints[i] = originalSubPoints[i] + randomOffsets[i] * (sin(orbitAngle)*amplitude)
            for (let i = 0; i < fiber.subPoints.length; i++) {
                fiber.subPoints[i] =
                    fiber.originalSubPoints[i] +
                    fiber.randomOffsets[i] *
                        (sineVal * this.deformationAmplitude);
            }
        }
    }

    // If you need to modify these points at runtime:
    public updateSimulationState(_data: Record<string, unknown>) {
        // not used in this example
    }

    // Provide type info for Simularium
    public getInfo(): TrajectoryFileInfo {
        const typeMapping: EncodedTypeMapping = {
            0: { name: "CubeFiber" },
            1: { name: "AxisFiberX" },
            2: { name: "AxisFiberY" },
            3: { name: "AxisFiberZ" },
            4: { name: "AxisEndSphere" },
            5: { name: "OrbitingSphere" },
        };
        return {
            connId: "debug-breathing-cube",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: this.currentFrame,
            size: {
                x: 10,
                y: 10,
                z: 10,
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

    private randomFloat(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }
}
