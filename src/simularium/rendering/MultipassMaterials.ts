import { Material, Matrix4, Mesh, ShaderMaterial, Scene, Vector2 } from "three";

export interface MultipassShaders {
    color: ShaderMaterial;
    position: ShaderMaterial;
    normal: ShaderMaterial;
}

export function updateProjectionMatrix(s: MultipassShaders, m: Matrix4): void {
    s.color.uniforms.projectionMatrix.value = m;
    s.position.uniforms.projectionMatrix.value = m;
    s.normal.uniforms.projectionMatrix.value = m;
}
export function updateResolution(
    s: MultipassShaders,
    x: number,
    y: number
): void {
    s.color.uniforms.iResolution.value = new Vector2(x, y);
    s.position.uniforms.iResolution.value = new Vector2(x, y);
    s.normal.uniforms.iResolution.value = new Vector2(x, y);
}

export enum GbufferRenderPass {
    COLOR,
    POSITION,
    NORMAL,
}

export function setRenderPass(
    obj: Mesh,
    shaderSet: MultipassShaders,
    pass: GbufferRenderPass
): Material {
    switch (pass) {
        case GbufferRenderPass.COLOR:
            obj.material = shaderSet.color;
            return shaderSet.color;
        case GbufferRenderPass.NORMAL:
            obj.material = shaderSet.normal;
            return shaderSet.normal;
        case GbufferRenderPass.POSITION:
            obj.material = shaderSet.position;
            return shaderSet.position;
    }
}

export function setSceneRenderPass(
    scene: Scene,
    shaderSet: MultipassShaders,
    pass: GbufferRenderPass
): Material {
    switch (pass) {
        case GbufferRenderPass.COLOR:
            scene.overrideMaterial = shaderSet.color;
            break;
        case GbufferRenderPass.NORMAL:
            scene.overrideMaterial = shaderSet.normal;
            break;
        case GbufferRenderPass.POSITION:
            scene.overrideMaterial = shaderSet.position;
            break;
    }
    return scene.overrideMaterial;
}
