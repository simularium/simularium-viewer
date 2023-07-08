import {
    Material,
    Matrix4,
    Mesh,
    Points,
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

export function setRenderPass(obj: Mesh | Points, shaderSet: MRTShaders): void {
    obj.material = shaderSet.mat;
}

export function setSceneRenderPass(
    scene: Scene,
    shaderSet: MRTShaders
): Material {
    scene.overrideMaterial = shaderSet.mat;
    return scene.overrideMaterial;
}
