import { InstancedFiberGroup } from "./InstancedFiber.js";
import { MRTShaders } from "./MultipassMaterials.js";
import { GeometryInstanceContainer } from "../types.js";
import { Group, OrthographicCamera, PerspectiveCamera, Scene, WebGLRenderer, WebGLRenderTarget } from "three";
declare class GBufferPass {
    pdbGbufferMaterials: MRTShaders;
    scene: Scene;
    instancedMeshGroup: Group;
    fibers: InstancedFiberGroup;
    meshTypes: GeometryInstanceContainer[];
    constructor();
    setMeshGroups(instancedMeshGroup: Group, fibers: InstancedFiberGroup, meshes: GeometryInstanceContainer[]): void;
    resize(width: number, height: number): void;
    render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera | OrthographicCamera, gbuffer: WebGLRenderTarget): void;
}
export default GBufferPass;
