import RenderToBuffer from "./RenderToBuffer";
import { OrthographicCamera, PerspectiveCamera, WebGLRenderer, WebGLRenderTarget } from "three";
declare class SSAO1Pass {
    pass: RenderToBuffer;
    constructor();
    resize(x: number, y: number): void;
    render(renderer: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget, normals: WebGLTexture, positions: WebGLTexture): void;
}
export default SSAO1Pass;
