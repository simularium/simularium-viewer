import { Mesh, Group, Matrix4 } from "three";
import { MRTShaders } from "./MultipassMaterials.js";
declare class InstancedFiber {
    private nCurvePoints;
    private nRadialSections;
    private nSegments;
    private curveGeometry;
    private mesh;
    private shaderSet;
    private instancedGeometry;
    private positionAttribute;
    private rotationAttribute;
    private instanceAttribute;
    private curveData;
    private currentInstance;
    private isUpdating;
    constructor(nCurvePoints: number, count: number);
    getMesh(): Mesh;
    getShaders(): MRTShaders;
    getCapacity(): number;
    private updateInstanceCount;
    reallocate(n: number): void;
    dispose(): void;
    beginUpdate(): void;
    private checkRealloc;
    addInstance(curvePts: number[], x: number, y: number, z: number, scale: number, rx: number, ry: number, rz: number, uniqueAgentId: number, typeId: number): void;
    endUpdate(): void;
}
declare class InstancedFiberGroup {
    private fibers;
    private fibersGroup;
    private isUpdating;
    static GROUP_NAME: string;
    constructor();
    getGroup(): Group;
    clear(): void;
    beginUpdate(): void;
    addInstance(nCurvePts: number, curvePts: number[], x: number, y: number, z: number, scale: number, rx: number, ry: number, rz: number, uniqueAgentId: number, typeId: number): void;
    endUpdate(): void;
    setRenderPass(): void;
    updateProjectionMatrix(cam: Matrix4): void;
}
export { InstancedFiber, InstancedFiberGroup };
