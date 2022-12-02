import { WebGLRenderer, WebGLRenderTarget } from "three";
import RenderToBuffer from "./RenderToBuffer";
declare class ContourPass {
    pass: RenderToBuffer;
    constructor();
    resize(x: number, y: number): void;
    setOutlineColor(value: number[]): void;
    setOutlineAlpha(value: number): void;
    setOutlineThickness(value: number): void;
    setFollowColor(value: number[]): void;
    setFollowAlpha(value: number): void;
    setFollowOutlineThickness(value: number): void;
    setFollowedInstance(instance: number): void;
    render(renderer: WebGLRenderer, target: WebGLRenderTarget | null, colorBuffer: WebGLRenderTarget, instanceIdBuffer: WebGLTexture, normalsBuffer: WebGLTexture): void;
}
export default ContourPass;
