import { Object3D } from "three";
import PDBModel from "../PDBModel";
import { InstancedMesh } from "../rendering/InstancedMesh";

export interface MeshLoadRequest {
    mesh: Object3D;
    cancelled: boolean;
    instances: InstancedMesh;
}

export enum GeometryDisplayType {
    PDB = "PDB",
    OBJ = "OBJ",
    SPHERE = "SPHERE",
    CUBE = "CUBE",
    GIZMO = "GIZMO",
}

export type PrimitiveDisplayType =
    | GeometryDisplayType.SPHERE
    | GeometryDisplayType.CUBE
    | GeometryDisplayType.GIZMO;

export interface PDBGeometry {
    geometry: PDBModel;
    displayType: GeometryDisplayType.PDB;
}

export interface MeshGeometry {
    geometry: MeshLoadRequest;
    displayType: GeometryDisplayType.OBJ | PrimitiveDisplayType;
}

export type AgentGeometry = PDBGeometry | MeshGeometry;
