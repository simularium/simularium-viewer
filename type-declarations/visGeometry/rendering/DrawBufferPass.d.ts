import { WebGLRenderer, WebGLRenderTarget } from "three";
import RenderToBuffer from "./RenderToBuffer.js";
declare class DrawBufferPass {
    pass: RenderToBuffer;
    constructor();
    resize(x: number, y: number): void;
    setScale(x: number, y: number, z: number, w: number): void;
    setBias(x: number, y: number, z: number, w: number): void;
    render(renderer: WebGLRenderer, target: WebGLRenderTarget | null, bufferToDraw: WebGLRenderTarget): void;
}
export default DrawBufferPass;
