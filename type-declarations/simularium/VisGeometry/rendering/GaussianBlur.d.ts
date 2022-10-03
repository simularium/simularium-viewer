import { WebGLRenderer, WebGLRenderTarget } from "three";
import RenderToBuffer from "./RenderToBuffer";
declare class BlurXPass {
    pass: RenderToBuffer;
    constructor();
    resize(x: any, y: any): void;
    render(renderer: any, tgt: any): void;
}
declare class BlurYPass {
    pass: RenderToBuffer;
    constructor();
    resize(x: any, y: any): void;
    render(renderer: any, tgt: any): void;
}
declare class BlurPass {
    blurXpass: BlurXPass;
    blurYpass: BlurYPass;
    constructor(radius: number);
    resize(x: number, y: number): void;
    setRadius(r: number): void;
    render(renderer: WebGLRenderer, target: WebGLRenderTarget, source: WebGLRenderTarget, positions: WebGLTexture, intermediateBuffer: WebGLRenderTarget): void;
}
export default BlurPass;
