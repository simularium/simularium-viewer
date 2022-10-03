import { InstancedFiberGroup } from "./InstancedFiber";
import { InstancedMesh } from "./InstancedMesh";
import { MRTShaders } from "./MultipassMaterials";
import { Group, Scene, WebGLRenderer, PerspectiveCamera, WebGLMultipleRenderTargets } from "three";
declare class GBufferPass {
    pdbGbufferMaterials: MRTShaders;
    scene: Scene;
    instancedMeshGroup: Group;
    fibers: InstancedFiberGroup;
    meshTypes: InstancedMesh[];
    constructor();
    setMeshGroups(instancedMeshGroup: Group, fibers: InstancedFiberGroup, meshes: InstancedMesh[]): void;
    resize(width: number, height: number): void;
    render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, gbuffer: WebGLMultipleRenderTargets): void;
}
export default GBufferPass;
