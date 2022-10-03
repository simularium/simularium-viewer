import { Group, ShaderMaterial, Scene, WebGLRenderer, PerspectiveCamera, WebGLRenderTarget } from "three";
declare class GBufferPass {
    colorMaterialMesh: ShaderMaterial;
    normalMaterialMesh: ShaderMaterial;
    positionMaterialMesh: ShaderMaterial;
    colorMaterialPDB: ShaderMaterial;
    normalMaterialPDB: ShaderMaterial;
    positionMaterialPDB: ShaderMaterial;
    colorMaterialInstancedMesh: ShaderMaterial;
    normalMaterialInstancedMesh: ShaderMaterial;
    positionMaterialInstancedMesh: ShaderMaterial;
    scene: Scene;
    agentMeshGroup: Group;
    agentPDBGroup: Group;
    agentFiberGroup: Group;
    instancedMeshGroup: Group;
    constructor();
    setMeshGroups(agentMeshGroup: Group, agentPDBGroup: Group, agentFiberGroup: Group, instancedMeshGroup: Group): void;
    resize(width: number, height: number): void;
    render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, colorBuffer: WebGLRenderTarget, normalBuffer: WebGLRenderTarget, positionBuffer: WebGLRenderTarget): void;
}
export default GBufferPass;
