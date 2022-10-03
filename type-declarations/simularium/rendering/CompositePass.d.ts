import { Color, PerspectiveCamera, WebGLRenderer, WebGLRenderTarget } from "three";
import RenderToBuffer from "./RenderToBuffer";
declare class CompositePass {
    pass: RenderToBuffer;
    constructor(bgHCLoffset?: {
        x: number;
        y: number;
        z: number;
    });
    updateColors(numColors: number, colorsData: Float32Array): void;
    setBgHueOffset(value: number): void;
    setBgChromaOffset(value: number): void;
    setBgLuminanceOffset(value: number): void;
    setBackgroundColor(color: Color): void;
    setFollowedInstance(instance: number): void;
    resize(x: number, y: number): void;
    render(renderer: WebGLRenderer, camera: PerspectiveCamera, target: WebGLRenderTarget, ssaoBuffer1: WebGLRenderTarget, ssaoBuffer2: WebGLRenderTarget, colorBuffer: WebGLRenderTarget): void;
}
export default CompositePass;
