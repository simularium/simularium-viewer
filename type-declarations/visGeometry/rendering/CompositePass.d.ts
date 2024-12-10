import { Color, OrthographicCamera, PerspectiveCamera, WebGLRenderer, WebGLRenderTarget } from "three";
import RenderToBuffer from "./RenderToBuffer.js";
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
    render(renderer: WebGLRenderer, camera: PerspectiveCamera | OrthographicCamera, target: WebGLRenderTarget, ssaoBuffer1: WebGLRenderTarget, ssaoBuffer2: WebGLRenderTarget, colorBuffer: WebGLTexture): void;
}
export default CompositePass;
