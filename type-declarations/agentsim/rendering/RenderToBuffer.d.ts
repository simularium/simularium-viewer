import { Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial } from "three";
declare class RenderToBuffer {
    frameCounter: number;
    sampleCounter: number;
    scene: Scene;
    geometry: PlaneBufferGeometry;
    material: ShaderMaterial;
    camera: OrthographicCamera;
    mesh: Mesh;
    constructor(paramsObj: any);
    render(renderer: any, target: any): void;
}
export default RenderToBuffer;
