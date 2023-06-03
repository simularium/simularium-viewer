import RenderToBuffer from "./RenderToBuffer";
import { DataTexture, OrthographicCamera, PerspectiveCamera, Vector3, WebGLRenderer, WebGLRenderTarget } from "three";
declare class SSAO1Pass {
    pass: RenderToBuffer;
    constructor(radius: number, threshold: number, falloff: number);
    resize(x: number, y: number): void;
    setRadius(value: number): void;
    render(renderer: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget, normals: WebGLTexture, positions: WebGLTexture): void;
    createNoiseTex(): DataTexture;
    createSSAOSamples(): Vector3[];
}
export default SSAO1Pass;
