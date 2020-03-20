import RenderToBuffer from "./RenderToBuffer";
declare class DrawBufferPass {
    pass: RenderToBuffer;
    constructor();
    resize(x: any, y: any): void;
    setScale(x: any, y: any, z: any, w: any): void;
    setBias(x: any, y: any, z: any, w: any): void;
    render(renderer: any, target: any, bufferToDraw: any): void;
}
export default DrawBufferPass;
