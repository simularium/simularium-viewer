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
    constructor(radius: any);
    resize(x: any, y: any): void;
    setRadius(r: any): void;
    render(renderer: any, target: any, source: any, positions: any, intermediateBuffer: any): void;
}
export default BlurPass;
