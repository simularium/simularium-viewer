import { Material, Matrix4, Mesh, Points, RawShaderMaterial, Scene } from "three";
export interface MRTShaders {
    mat: RawShaderMaterial;
}
export declare function updateProjectionMatrix(s: MRTShaders, m: Matrix4): void;
export declare function updateResolution(s: MRTShaders, x: number, y: number): void;
export declare function setRenderPass(obj: Mesh | Points, shaderSet: MRTShaders): void;
export declare function setSceneRenderPass(scene: Scene, shaderSet: MRTShaders): Material;
