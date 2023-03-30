import {
    DataTexture,
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
    transMat?: RawShaderMaterial;
}

export function updateProjectionMatrix(s: MRTShaders, m: Matrix4): void {
    s.mat.uniforms.projectionMatrix.value = m;
    if (s.transMat) {
        s.transMat.uniforms.projectionMatrix.value = m;
    }
}
export function updateResolution(s: MRTShaders, x: number, y: number): void {
    s.mat.uniforms.iResolution.value = new Vector2(x, y);
    if (s.transMat) {
        s.transMat.uniforms.iResolution.value = new Vector2(x, y);
    }
}
export function updateColors(s: MRTShaders, tex: DataTexture | null): void {
    s.mat.uniforms.colorsBuffer.value = tex;
    if (s.transMat) {
        s.transMat.uniforms.colorsBuffer.value = tex;
    }
}
export function updateOpacity(s: MRTShaders, opacity: number) {
    s.mat.uniforms.opacity.value = opacity;
    if (s.transMat) {
        s.transMat.uniforms.opacity.value = opacity;
    }
}

export function setRenderPass(
    obj: Mesh | Points,
    shaderSet: MRTShaders,
    transparent = false
): Material {
    obj.material = transparent ? shaderSet.transMat : shaderSet.mat;
}

export function setSceneRenderPass(
    scene: Scene,
    shaderSet: MRTShaders
): Material {
    scene.overrideMaterial = shaderSet.mat;
    return scene.overrideMaterial;
}
