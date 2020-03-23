import RenderToBuffer from "./RenderToBuffer";
import { DataTexture, Vector3 } from "three";
declare class SSAO1Pass {
    pass: RenderToBuffer;
    constructor(radius: any, threshold: any, falloff: any);
    resize(x: any, y: any): void;
    render(renderer: any, camera: any, target: any, normals: any, positions: any): void;
    createNoiseTex(): DataTexture;
    createSSAOSamples(): Vector3[];
}
export default SSAO1Pass;
