import RenderToBuffer from "./RenderToBuffer";
declare class ContourPass {
    pass: RenderToBuffer;
    constructor();
    resize(x: any, y: any): void;
    render(renderer: any, target: any, colorBuffer: any, instanceIdBuffer: any): void;
}
export default ContourPass;
