import { BufferGeometry, Group } from "three";
import { MRTShaders } from "./MultipassMaterials";
import { GeometryInstanceContainer } from "../types";
declare class MetaballMesh implements GeometryInstanceContainer {
    private drawable;
    private shaderSet;
    constructor(name: string);
    getMesh(): Group;
    getShaders(): MRTShaders;
    instanceCount(): number;
    beginUpdate(): void;
    endUpdate(): void;
    replaceGeometry(_newGeom: BufferGeometry, _meshName: string): void;
    addInstance(x: number, y: number, z: number, scale: number, rx: number, ry: number, rz: number, uniqueAgentId: number, typeId: number, lodScale?: number, subPoints?: number[]): void;
}
export { MetaballMesh };
