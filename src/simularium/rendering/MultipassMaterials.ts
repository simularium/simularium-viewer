import {
    Material,
    Matrix4,
    Mesh,
    RawShaderMaterial,
    Scene,
    Vector2,
} from "three";

export interface MRTShaders {
    mat: RawShaderMaterial;
}

export function updateProjectionMatrix(s: MRTShaders, m: Matrix4): void {
    s.mat.uniforms.projectionMatrix.value = m;
}
export function updateResolution(s: MRTShaders, x: number, y: number): void {
    s.mat.uniforms.iResolution.value = new Vector2(x, y);
}

export enum GbufferRenderPass {
    COLOR,
    POSITION,
    NORMAL,
}

export function setRenderPass(
    obj: Mesh,
    shaderSet: MRTShaders,
    pass: GbufferRenderPass
): Material {
    obj.material = shaderSet.mat;
}

export function setSceneRenderPass(
    scene: Scene,
    shaderSet: MRTShaders,
    pass: GbufferRenderPass
): Material {
    scene.overrideMaterial = shaderSet.mat;
    return scene.overrideMaterial;
}
