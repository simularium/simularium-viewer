import { Vector2, WebGLRenderer, WebGLRenderTarget } from "three";
import RenderToBuffer from "./RenderToBuffer";
declare class BlurPass1D {
    pass: RenderToBuffer;
    private uvOffset;
    private radius;
    private stdDev;
    constructor(uvOffset: Vector2, radius: number, stdDev: number);
    resize(x: any, y: any): void;
    render(renderer: any, tgt: any): void;
    private createSampleWeights;
    private createSampleOffsets;
    configure(kernelRadius: number, stdDev: number): void;
}
declare class BlurPass {
    blurXpass: BlurPass1D;
    blurYpass: BlurPass1D;
    constructor(radius: number, stdDev: number);
    resize(x: number, y: number): void;
    configure(radius: number, stdDev: number, depthCutoff: number): void;
    render(renderer: WebGLRenderer, target: WebGLRenderTarget, source: WebGLRenderTarget, positions: WebGLTexture, intermediateBuffer: WebGLRenderTarget): void;
}
export default BlurPass;
