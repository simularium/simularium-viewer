import { InstancedFiberGroup } from "./InstancedFiber";
import { MRTShaders } from "./MultipassMaterials";
import { GeometryInstanceContainer } from "../types";
import { Group, Scene, WebGLRenderer, PerspectiveCamera, WebGLMultipleRenderTargets } from "three";
declare class GBufferPass {
    pdbGbufferMaterials: MRTShaders;
    scene: Scene;
    instancedMeshGroup: Group;
    fibers: InstancedFiberGroup;
    meshTypes: GeometryInstanceContainer[];
    constructor();
    setMeshGroups(instancedMeshGroup: Group, fibers: InstancedFiberGroup, meshes: GeometryInstanceContainer[]): void;
    resize(width: number, height: number): void;
    render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, gbuffer: WebGLMultipleRenderTargets): void;
}
export default GBufferPass;
