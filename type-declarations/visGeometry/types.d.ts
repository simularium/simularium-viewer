import { BufferGeometry, Color, Object3D } from "three";
import PDBModel from "./PDBModel";
import { MRTShaders } from "./rendering/MultipassMaterials";
export interface GeometryInstanceContainer {
    replaceGeometry: (newGeometry: BufferGeometry, name: string) => void;
    getMesh: () => Object3D;
    beginUpdate: () => void;
    endUpdate: () => void;
    addInstance: (x: number, y: number, z: number, scale: number, rx: number, ry: number, rz: number, uniqueAgentId: number, typeId: number, lodScale: number, subPoints: number[]) => void;
    instanceCount: () => number;
    getShaders: () => MRTShaders;
}
export interface MeshLoadRequest {
    mesh: Object3D;
    cancelled: boolean;
    instances: GeometryInstanceContainer;
}
export declare enum GeometryDisplayType {
    PDB = "PDB",
    OBJ = "OBJ",
    SPHERE = "SPHERE",
    CUBE = "CUBE",
    GIZMO = "GIZMO",
    SPHERE_GROUP = "SPHERE_GROUP"
}
export declare type PrimitiveDisplayType = GeometryDisplayType.SPHERE | GeometryDisplayType.CUBE | GeometryDisplayType.GIZMO;
export interface PDBGeometry {
    geometry: PDBModel;
    displayType: GeometryDisplayType.PDB;
}
export interface MeshGeometry {
    geometry: MeshLoadRequest;
    displayType: GeometryDisplayType.SPHERE_GROUP | GeometryDisplayType.OBJ | PrimitiveDisplayType;
}
export declare type AgentGeometry = PDBGeometry | MeshGeometry;
export interface GeometryStoreLoadResponse {
    displayType?: GeometryDisplayType;
    geometry: MeshLoadRequest | PDBModel;
    errorMessage?: string;
}
export interface AgentColorInfo {
    color: Color;
    colorId: number;
}
export interface ColorAssignment {
    agentIds: number[];
    color: string | number;
}
