import {
    IClientSimulatorImpl,
    ClientMessageEnum,
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
    VisTypes,
    DEFAULT_CAMERA_SPEC,
} from "@aics/simularium-viewer";

// Interface for basic molecule properties
interface MoleculeDefinition {
    x: number;
    y: number;
    z: number;
    typeId: number;
    instanceId: number;
    radius: number;
}

// Interface for rod-shaped molecules
interface RodMoleculeDefinition extends MoleculeDefinition {
    endX: number;
    endY: number;
    endZ: number;
}

// Interface for triangular molecules
interface TriangleMoleculeDefinition extends MoleculeDefinition {
    vertices: number[]; // Array of [x1,y1,z1,x2,y2,z2,x3,y3,z3]
}

// Interface for tetrahedral molecules
interface TetrahedralMoleculeDefinition extends MoleculeDefinition {
    vertices: number[]; // Array of [x1,y1,z1,x2,y2,z2,x3,y3,z3,x4,y4,z4]
}

export default class ClaudeBrownian implements IClientSimulatorImpl {
    private currentFrame = 0;

    // Arrays to store our molecules
    private spheresSmall: MoleculeDefinition[] = [];
    private spheresLarge: MoleculeDefinition[] = [];
    private rods: RodMoleculeDefinition[] = [];
    private tetrahedra: TetrahedralMoleculeDefinition[] = [];

    // Molecule type constants
    private static readonly TYPE_SPHERE_SMALL = 0;
    private static readonly TYPE_SPHERE_LARGE = 1;
    private static readonly TYPE_ROD = 2;
    private static readonly TYPE_TETRAHEDRON = 3;

    // Simulation parameters
    private brownianIntensity = 0.05;
    private simulationBounds = 10; // Simulation box size
    private moleculesPerType = 100;

    constructor(private numMoleculeTypes: number = 4) {
        // Validate input
        if (numMoleculeTypes < 1 || numMoleculeTypes > 4) {
            console.warn(
                `Invalid number of molecule types (${numMoleculeTypes}). Using default of 4.`
            );
            this.numMoleculeTypes = 4;
        }

        // Initialize molecules
        this.initializeMolecules();
    }

    private initializeMolecules(): void {
        // Initialize molecule types based on numMoleculeTypes
        if (this.numMoleculeTypes >= 1) {
            this.initializeSpheresSmall();
        }

        if (this.numMoleculeTypes >= 2) {
            this.initializeSpheresLarge();
        }

        if (this.numMoleculeTypes >= 3) {
            this.initializeRods();
        }

        if (this.numMoleculeTypes >= 4) {
            this.initializeTetrahedra();
        }
    }

    private initializeSpheresSmall(): void {
        // Place small spheres on XY plane (z = simulationBounds/2)
        const z = this.simulationBounds / 2;
        const radius = 0.2; // Small sphere radius

        for (let i = 0; i < this.moleculesPerType; i++) {
            // Calculate evenly distributed positions on a circle in XY plane
            const angle = (i / this.moleculesPerType) * 2 * Math.PI;
            const distance = this.randomFloat(2, this.simulationBounds / 2 - 1);
            const x = distance * Math.cos(angle);
            const y = distance * Math.sin(angle);

            this.spheresSmall.push({
                x,
                y,
                z,
                typeId: ClaudeBrownian.TYPE_SPHERE_SMALL,
                instanceId: i,
                radius,
            });
        }
    }

    private initializeSpheresLarge(): void {
        // Place large spheres on XZ plane (y = simulationBounds/2)
        const y = this.simulationBounds / 2;
        const radius = 0.4; // Large sphere radius

        for (let i = 0; i < this.moleculesPerType; i++) {
            // Calculate evenly distributed positions on a circle in XZ plane
            const angle = (i / this.moleculesPerType) * 2 * Math.PI;
            const distance = this.randomFloat(2, this.simulationBounds / 2 - 1);
            const x = distance * Math.cos(angle);
            const z = distance * Math.sin(angle);

            this.spheresLarge.push({
                x,
                y,
                z,
                typeId: ClaudeBrownian.TYPE_SPHERE_LARGE,
                instanceId: this.moleculesPerType + i, // Offset instance IDs
                radius,
            });
        }
    }

    private initializeRods(): void {
        // Place rod molecules on YZ plane (x = simulationBounds/2)
        const x = this.simulationBounds / 2;
        const radius = 0.15; // Rod radius
        const rodLength = 0.8; // Length of rod

        for (let i = 0; i < this.moleculesPerType; i++) {
            // Calculate evenly distributed positions on a circle in YZ plane
            const angle = (i / this.moleculesPerType) * 2 * Math.PI;
            const distance = this.randomFloat(2, this.simulationBounds / 2 - 1);
            const y = distance * Math.cos(angle);
            const z = distance * Math.sin(angle);

            // Calculate vector pointing toward origin for orientation
            const dx = 0 - x;
            const dy = 0 - y;
            const dz = 0 - z;

            // Normalize the direction vector
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const normalizedDx = dx / length;
            const normalizedDy = dy / length;
            const normalizedDz = dz / length;

            // Calculate end point based on direction and rod length
            const endX = x + normalizedDx * rodLength;
            const endY = y + normalizedDy * rodLength;
            const endZ = z + normalizedDz * rodLength;

            this.rods.push({
                x,
                y,
                z,
                endX,
                endY,
                endZ,
                typeId: ClaudeBrownian.TYPE_ROD,
                instanceId: 2 * this.moleculesPerType + i, // Offset instance IDs
                radius,
            });
        }
    }

    private initializeTetrahedra(): void {
        // Place tetrahedral molecules on a diagonal plane
        const planeDistance = this.simulationBounds / 2;
        const radius = 0.1; // Vertex radius
        const edgeLength = 0.6; // Length of tetrahedron edge

        for (let i = 0; i < this.moleculesPerType; i++) {
            // Distribute on a circular area of the plane x + y + z = planeDistance
            const angle = (i / this.moleculesPerType) * 2 * Math.PI;
            const radialDistance = this.randomFloat(
                2,
                this.simulationBounds / 3
            );

            // Parametric coordinates on the plane
            const u = radialDistance * Math.cos(angle);
            const v = radialDistance * Math.sin(angle);

            // Convert to 3D coordinates on the plane x + y + z = planeDistance
            // This is one way to parameterize a plane
            const x = planeDistance / 3 + u;
            const y = planeDistance / 3 + v;
            const z = planeDistance - x - y;

            // Direction toward origin for orientation
            const dx = 0 - x;
            const dy = 0 - y;
            const dz = 0 - z;

            // Normalize
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const normalizedDx = dx / length;
            const normalizedDy = dy / length;
            const normalizedDz = dz / length;

            // Create a tetrahedron - we'll calculate points of a tetrahedron
            // around the center point, with one vertex pointing toward the origin

            // First, we need a right-handed coordinate system
            // We'll use the normalized direction as one axis
            // and generate two perpendicular axes
            let perpX1 = 0,
                perpY1 = 0,
                perpZ1 = 0;
            let perpX2 = 0,
                perpY2 = 0,
                perpZ2 = 0;

            // Find first perpendicular vector
            if (Math.abs(normalizedDx) < Math.abs(normalizedDy)) {
                // Use (1,0,0) to generate first perpendicular
                perpX1 = 0;
                perpY1 = -normalizedDz;
                perpZ1 = normalizedDy;
            } else {
                // Use (0,1,0) to generate first perpendicular
                perpX1 = normalizedDz;
                perpY1 = 0;
                perpZ1 = -normalizedDx;
            }

            // Normalize
            const perpLength1 = Math.sqrt(
                perpX1 * perpX1 + perpY1 * perpY1 + perpZ1 * perpZ1
            );
            perpX1 /= perpLength1;
            perpY1 /= perpLength1;
            perpZ1 /= perpLength1;

            // Second perpendicular vector using cross product
            perpX2 = normalizedDy * perpZ1 - normalizedDz * perpY1;
            perpY2 = normalizedDz * perpX1 - normalizedDx * perpZ1;
            perpZ2 = normalizedDx * perpY1 - normalizedDy * perpX1;

            // Calculate tetrahedron vertices
            const vertices: number[] = [];

            // Height of the tetrahedron
            const height = (edgeLength * Math.sqrt(6)) / 3;

            // Vertex 1: Center + direction * height
            const v1x = x + normalizedDx * height;
            const v1y = y + normalizedDy * height;
            const v1z = z + normalizedDz * height;

            // Base vertices
            const baseRadius = (edgeLength * Math.sqrt(3)) / 3;

            // Vertex 2, 3, 4: Create an equilateral triangle on the base
            for (let j = 0; j < 3; j++) {
                const baseAngle = j * ((2 * Math.PI) / 3);
                const vx =
                    x -
                    normalizedDx * (height / 3) +
                    baseRadius *
                        (perpX1 * Math.cos(baseAngle) +
                            perpX2 * Math.sin(baseAngle));
                const vy =
                    y -
                    normalizedDy * (height / 3) +
                    baseRadius *
                        (perpY1 * Math.cos(baseAngle) +
                            perpY2 * Math.sin(baseAngle));
                const vz =
                    z -
                    normalizedDz * (height / 3) +
                    baseRadius *
                        (perpZ1 * Math.cos(baseAngle) +
                            perpZ2 * Math.sin(baseAngle));

                vertices.push(vx, vy, vz);
            }

            // Add the top vertex
            vertices.push(v1x, v1y, v1z);

            this.tetrahedra.push({
                x,
                y,
                z,
                typeId: ClaudeBrownian.TYPE_TETRAHEDRON,
                instanceId: 3 * this.moleculesPerType + i, // Offset instance IDs
                radius,
                vertices,
            });
        }
    }

    // Method to apply Brownian motion to a position
    private applyBrownianMotion(position: {
        x: number;
        y: number;
        z: number;
    }): void {
        // Add random displacement
        position.x += this.randomFloat(
            -this.brownianIntensity,
            this.brownianIntensity
        );
        position.y += this.randomFloat(
            -this.brownianIntensity,
            this.brownianIntensity
        );
        position.z += this.randomFloat(
            -this.brownianIntensity,
            this.brownianIntensity
        );

        // Keep within bounds
        position.x = Math.max(
            -this.simulationBounds / 2,
            Math.min(this.simulationBounds / 2, position.x)
        );
        position.y = Math.max(
            -this.simulationBounds / 2,
            Math.min(this.simulationBounds / 2, position.y)
        );
        position.z = Math.max(
            -this.simulationBounds / 2,
            Math.min(this.simulationBounds / 2, position.z)
        );
    }

    // Method to update tetrahedron vertices after Brownian motion
    private updateTetrahedronVertices(
        tetra: TetrahedralMoleculeDefinition
    ): void {
        // Move all vertices with the same Brownian motion as the center
        const dx =
            tetra.x -
            (tetra.vertices[9] +
                tetra.vertices[0] +
                tetra.vertices[3] +
                tetra.vertices[6]) /
                4;
        const dy =
            tetra.y -
            (tetra.vertices[10] +
                tetra.vertices[1] +
                tetra.vertices[4] +
                tetra.vertices[7]) /
                4;
        const dz =
            tetra.z -
            (tetra.vertices[11] +
                tetra.vertices[2] +
                tetra.vertices[5] +
                tetra.vertices[8]) /
                4;

        // Update each vertex
        for (let i = 0; i < 12; i += 3) {
            tetra.vertices[i] += dx;
            tetra.vertices[i + 1] += dy;
            tetra.vertices[i + 2] += dz;
        }
    }

    // Method to update rod endpoints after Brownian motion
    private updateRodEndpoints(rod: RodMoleculeDefinition): void {
        // Calculate the rod direction vector
        const dirX = rod.endX - rod.x;
        const dirY = rod.endY - rod.y;
        const dirZ = rod.endZ - rod.z;

        // Calculate the length of the rod
        const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

        // Normalize the direction vector
        const normalizedDirX = dirX / length;
        const normalizedDirY = dirY / length;
        const normalizedDirZ = dirZ / length;

        // Update the endpoint to maintain the original length and direction
        rod.endX = rod.x + normalizedDirX * length;
        rod.endY = rod.y + normalizedDirY * length;
        rod.endZ = rod.z + normalizedDirZ * length;
    }

    public update(_dt: number): VisDataMessage {
        // Apply Brownian motion to all molecules

        // 1. Small spheres
        for (const sphere of this.spheresSmall) {
            this.applyBrownianMotion(sphere);
        }

        // 2. Large spheres
        for (const sphere of this.spheresLarge) {
            this.applyBrownianMotion(sphere);
        }

        // 3. Rods
        for (const rod of this.rods) {
            this.applyBrownianMotion(rod);
            this.updateRodEndpoints(rod);
        }

        // 4. Tetrahedra
        for (const tetra of this.tetrahedra) {
            this.applyBrownianMotion(tetra);
            this.updateTetrahedronVertices(tetra);
        }

        // Construct the agent data
        const agentData: number[] = [];

        // Add small spheres
        if (this.numMoleculeTypes >= 1) {
            for (const sphere of this.spheresSmall) {
                agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // Default visualization type (sphere)
                agentData.push(sphere.instanceId); // Instance ID
                agentData.push(sphere.typeId); // Type ID
                agentData.push(sphere.x, sphere.y, sphere.z); // Position
                agentData.push(0, 0, 0); // Orientation (not needed for spheres)
                agentData.push(sphere.radius); // Radius
                agentData.push(0); // No additional subpoints
            }
        }

        // Add large spheres
        if (this.numMoleculeTypes >= 2) {
            for (const sphere of this.spheresLarge) {
                agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT);
                agentData.push(sphere.instanceId);
                agentData.push(sphere.typeId);
                agentData.push(sphere.x, sphere.y, sphere.z);
                agentData.push(0, 0, 0);
                agentData.push(sphere.radius);
                agentData.push(0);
            }
        }

        // Add rods
        if (this.numMoleculeTypes >= 3) {
            for (const rod of this.rods) {
                // Rods are represented as fibers with 2 points
                agentData.push(VisTypes.ID_VIS_TYPE_FIBER);
                agentData.push(rod.instanceId);
                agentData.push(rod.typeId);
                agentData.push(0, 0, 0, 0, 0, 0); // No transformation
                agentData.push(rod.radius); // Radius
                agentData.push(6); // Number of floats in data (2 points × 3 coordinates)

                // Add the two points of the rod
                agentData.push(rod.x, rod.y, rod.z);
                agentData.push(rod.endX, rod.endY, rod.endZ);
            }
        }

        // Add tetrahedra
        if (this.numMoleculeTypes >= 4) {
            for (const tetra of this.tetrahedra) {
                // Tetrahedra need 6 fibers (edges) to be drawn
                const edges = [
                    // Point 0 to others
                    [0, 3],
                    [0, 6],
                    [0, 9],
                    // Remaining edges
                    [3, 6],
                    [6, 9],
                    [9, 3],
                ];

                for (let e = 0; e < edges.length; e++) {
                    const [pointIdxA, pointIdxB] = edges[e];

                    agentData.push(VisTypes.ID_VIS_TYPE_FIBER);
                    // Unique ID for each edge
                    agentData.push(tetra.instanceId * 10 + e);
                    agentData.push(tetra.typeId);
                    agentData.push(0, 0, 0, 0, 0, 0); // No transformation
                    agentData.push(tetra.radius); // Radius
                    agentData.push(6); // Number of floats (2 points × 3 coordinates)

                    // Add the two vertices of this edge
                    agentData.push(
                        tetra.vertices[pointIdxA],
                        tetra.vertices[pointIdxA + 1],
                        tetra.vertices[pointIdxA + 2],
                        tetra.vertices[pointIdxB],
                        tetra.vertices[pointIdxB + 1],
                        tetra.vertices[pointIdxB + 2]
                    );
                }
            }
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
            fileName: "molecular-simulation",
        };

        this.currentFrame++;
        return frameData;
    }

    public updateSimulationState(data: Record<string, unknown>): void {
        // Handle simulation state updates if needed
        console.log("Simulation state update:", data);

        // Example: Adjust Brownian motion intensity
        if (typeof data.brownianIntensity === "number") {
            this.brownianIntensity = data.brownianIntensity;
        }
    }

    public getInfo(): TrajectoryFileInfo {
        const typeMapping: EncodedTypeMapping = {
            0: { name: "SmallSphere" },
            1: { name: "LargeSphere" },
            2: { name: "RodMolecule" },
            3: { name: "TetrahedralMolecule" },
        };

        return {
            connId: "molecular-simulation",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: this.currentFrame,
            size: {
                x: this.simulationBounds,
                y: this.simulationBounds,
                z: this.simulationBounds,
            },
            cameraDefault: DEFAULT_CAMERA_SPEC,
            typeMapping: typeMapping,
            spatialUnits: {
                magnitude: 1,
                name: "nm", // nanometers
            },
            timeUnits: {
                magnitude: 1,
                name: "ns", // nanoseconds
            },
        };
    }

    private randomFloat(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
}
