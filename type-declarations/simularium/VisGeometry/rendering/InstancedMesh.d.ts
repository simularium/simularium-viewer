import { BufferGeometry, Mesh, Points } from "three";
import { MRTShaders } from "./MultipassMaterials";
export declare enum InstanceType {
    MESH = 0,
    POINTS = 1
}
declare class InstancedMesh {
    private baseGeometry;
    private drawable;
    private shaderSet;
    private instancedGeometry;
    private positionAttribute;
    private rotationAttribute;
    private instanceAttribute;
    private currentInstance;
    private isUpdating;
    constructor(type: InstanceType, baseGeometry: BufferGeometry, name: string, count: number);
    getMesh(): Mesh | Points;
    getShaders(): MRTShaders;
    getCapacity(): number;
    instanceCount(): number;
    private updateInstanceCount;
    replaceGeometry(geometry: BufferGeometry, name: string): void;
    reallocate(n: number): void;
    dispose(): void;
    beginUpdate(): void;
    private checkRealloc;
    addInstance(x: number, y: number, z: number, scale: number, rx: number, ry: number, rz: number, uniqueAgentId: number, typeId: number, lodScale?: number): void;
    endUpdate(): void;
}
export { InstancedMesh };
