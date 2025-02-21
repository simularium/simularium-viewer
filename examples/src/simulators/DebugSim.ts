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
    subPoints: number[];
    originalSubPoints: number[];
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

interface OrbitingSphereParams {
    sphere: SphereDefinition;
    orbitAngle: number;
    orbitSpeed: number;
    radius: number;
    plane: "xy" | "xz" | "yz";
}


export default class DebugSimBreathingCube implements IClientSimulatorImpl {
    private currentFrame = 0;
    private orbitAngle = 0;

    private cubeEdges: FiberDefinition[] = [];
    private axisFibers: FiberDefinition[] = [];
    private axisSpheres: SphereDefinition[] = [];
    private orbitingSpheres: OrbitingSphereParams[] = [];

    private orbitingSpherePlaneIndex = 0;
    private nextOrbitSphereInstanceId = 301;

    private orbitSpeed = 0.05;
    private deformationAmplitude = 0.2;

    constructor() {
        this.buildCubeEdges();
        this.buildAxisFibersAndSpheres();

        this.orbitingSpheres.push({
            sphere: {
                x: 3,
                y: 0,
                z: 0,
                typeId: 5, // orbiting sphere type
                instanceId: 300, // arbitrary ID
            },
            orbitAngle: 0,
            orbitSpeed: 0.05,
            radius: 3,
            plane: "xy",
        });
    }

    // ------------------------------------------------------------------------
    // NEW METHOD: Automatically creates and adds an orbiting sphere with:
    // - A cycling orbit plane ("xy", "xz", "yz")
    // - A randomized initial angle and orbit speed
    // ------------------------------------------------------------------------
    public addAutoOrbitingSphere(): void {
        const orbitPlanes: ("xy" | "xz" | "yz")[] = ["xy", "xz", "yz"];
        // Cycle through the available orbit planes.
        const plane = orbitPlanes[this.orbitingSpherePlaneIndex];
        this.orbitingSpherePlaneIndex =
            (this.orbitingSpherePlaneIndex + 1) % orbitPlanes.length;

        // Generate a random initial angle (0 to 2π) and a random orbit speed between 0.01 and 0.1.
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 0.09 + 0.01;
        const radius = 3;

        // Calculate the initial position based on the chosen orbit plane.
        let x = 0,
            y = 0,
            z = 0;
        if (plane === "xy") {
            x = radius * Math.cos(angle);
            y = radius * Math.sin(angle);
            z = 0;
        } else if (plane === "xz") {
            x = radius * Math.cos(angle);
            y = 0;
            z = radius * Math.sin(angle);
        } else if (plane === "yz") {
            x = 0;
            y = radius * Math.cos(angle);
            z = radius * Math.sin(angle);
        }

        const newSphere: OrbitingSphereParams = {
            sphere: {
                x,
                y,
                z,
                typeId: 5, // orbiting sphere type
                instanceId: this.nextOrbitSphereInstanceId,
            },
            orbitAngle: angle,
            orbitSpeed: speed,
            radius: radius,
            plane: plane,
        };

        this.nextOrbitSphereInstanceId++;
        this.orbitingSpheres.push(newSphere);
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
        const subPoints = originalSubPoints.slice();
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
    //   1) Move the orbiting spheres
    //   2) Deform each fiber to a "breathing" shape by:
    //      subPoints[i] = originalSubPoints[i] + randomOffsets[i] * (sin(orbitAngle) * amplitude)
    //   => So each revolution of orbitAngle (2π) returns to original shape.
    // ------------------------------------------------------------------------
    public update(_dt: number): VisDataMessage {
        // 1) Move orbiting sphere
        this.orbitAngle += this.orbitSpeed;
        const radius = 3;
        this.orbitingSpheres.forEach((orbitParams) => {
            orbitParams.orbitAngle += orbitParams.orbitSpeed;
            // Update position based on the specified plane.
            if (orbitParams.plane === "xy") {
                orbitParams.sphere.x =
                    orbitParams.radius * Math.cos(orbitParams.orbitAngle);
                orbitParams.sphere.y =
                    orbitParams.radius * Math.sin(orbitParams.orbitAngle);
                // Z remains unchanged.
            } else if (orbitParams.plane === "xz") {
                orbitParams.sphere.x =
                    orbitParams.radius * Math.cos(orbitParams.orbitAngle);
                orbitParams.sphere.z =
                    orbitParams.radius * Math.sin(orbitParams.orbitAngle);
                // Y remains unchanged.
            } else if (orbitParams.plane === "yz") {
                orbitParams.sphere.y =
                    orbitParams.radius * Math.cos(orbitParams.orbitAngle);
                orbitParams.sphere.z =
                    orbitParams.radius * Math.sin(orbitParams.orbitAngle);
                // X remains unchanged.
            }
        });

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

        // Orbiting spheres
        for (const orbitParams of this.orbitingSpheres) {
            const sphere = orbitParams.sphere;
            agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT);
            agentData.push(sphere.instanceId);
            agentData.push(sphere.typeId);
            agentData.push(sphere.x, sphere.y, sphere.z);
            agentData.push(0, 0, 0);
            agentData.push(0.4);
            agentData.push(0);
        }

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

    public updateSimulationState(data: Record<string, unknown>) {
        console.log("data", data);
        if (data.newOrbitingSphere === true) {
            console.log("Adding new orbiting sphere");
            this.addAutoOrbitingSphere();
        }
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
