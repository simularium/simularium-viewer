import RenderToBuffer from "./RenderToBuffer";
declare class CompositePass {
    pass: RenderToBuffer;
    constructor();
    updateColors(numColors: any, colorsData: any): void;
    resize(x: any, y: any): void;
    render(renderer: any, camera: any, target: any, ssaoBuffer1: any, ssaoBuffer2: any, colorBuffer: any): void;
}
export default CompositePass;
