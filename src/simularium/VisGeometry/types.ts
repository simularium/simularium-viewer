import { Object3D } from "three";
import PDBModel from "./PDBModel";
import { InstancedMesh } from "./rendering/InstancedMesh";

export interface MeshLoadRequest {
    mesh: Object3D;
    cancelled: boolean;
    instances: InstancedMesh;
}

export const enum GeometryDisplayType {
    PDB = "PDB",
    CIF = "CIF",
    OBJ = "OBJ",
    SPHERE = "SPHERE",
    CUBE = "CUBE",
    GIZMO = "GIZMO",
}

export type MolecularDisplayType =
    | GeometryDisplayType.PDB
    | GeometryDisplayType.CIF;
export interface PDBGeometry {
    geometry: PDBModel;
    displayType: MolecularDisplayType;
}

export type PrimitiveDisplayType =
    | GeometryDisplayType.SPHERE
    | GeometryDisplayType.CUBE
    | GeometryDisplayType.GIZMO;
export interface MeshGeometry {
    geometry: MeshLoadRequest;
    displayType: GeometryDisplayType.OBJ | PrimitiveDisplayType;
}

export type AgentGeometry = PDBGeometry | MeshGeometry;

export interface GeometryStoreLoadResponse {
    displayType?: GeometryDisplayType;
    geometry: MeshLoadRequest | PDBModel;
    errorMessage?: string;
}

export function isPDBLike(displayType: GeometryDisplayType): boolean {
    return (
        displayType === GeometryDisplayType.PDB ||
        displayType === GeometryDisplayType.CIF
    );
}

export function isPrimitiveLike(displayType: GeometryDisplayType): boolean {
    return (
        displayType === GeometryDisplayType.SPHERE ||
        displayType === GeometryDisplayType.CUBE ||
        displayType === GeometryDisplayType.GIZMO
    );
}
