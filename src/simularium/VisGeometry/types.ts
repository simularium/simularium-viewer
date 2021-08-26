import { Object3D } from "three";
import { InstancedMesh } from "../rendering/InstancedMesh";

export interface MeshLoadRequest {
    mesh: Object3D;
    cancelled: boolean;
    instances: InstancedMesh;
}
