import { Object3D } from "three";
import PDBModel from "./PDBModel";
import { InstancedMesh } from "./rendering/InstancedMesh";
export interface MeshLoadRequest {
    mesh: Object3D;
    cancelled: boolean;
    instances: InstancedMesh;
}
export declare enum GeometryDisplayType {
    PDB = "PDB",
    OBJ = "OBJ",
    SPHERE = "SPHERE",
    CUBE = "CUBE",
    GIZMO = "GIZMO"
}
export declare type PrimitiveDisplayType = GeometryDisplayType.SPHERE | GeometryDisplayType.CUBE | GeometryDisplayType.GIZMO;
export interface PDBGeometry {
    geometry: PDBModel;
    displayType: GeometryDisplayType.PDB;
}
export interface MeshGeometry {
    geometry: MeshLoadRequest;
    displayType: GeometryDisplayType.OBJ | PrimitiveDisplayType;
}
export declare type AgentGeometry = PDBGeometry | MeshGeometry;
export interface GeometryStoreLoadResponse {
    displayType?: GeometryDisplayType;
    geometry: MeshLoadRequest | PDBModel;
    errorMessage?: string;
}
