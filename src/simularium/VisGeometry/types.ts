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

export interface AgentGeometry {
    geometry: PDBModel | MeshLoadRequest;
    displayType: GeometryDisplayType;
}

export interface AgentTypeGeometry {
    name: string;
    displayType: GeometryDisplayType;
}
