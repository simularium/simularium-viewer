import { IUniform, Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, WebGLRenderer, WebGLRenderTarget } from "three";
interface RenderToBufferParams {
    fragmentShader: string;
    uniforms: {
        [uniform: string]: IUniform;
    };
}
declare class RenderToBuffer {
    scene: Scene;
    geometry: PlaneBufferGeometry;
    material: ShaderMaterial;
    camera: OrthographicCamera;
    mesh: Mesh;
    constructor(paramsObj: RenderToBufferParams);
    render(renderer: WebGLRenderer, target: WebGLRenderTarget | null): void;
}
export default RenderToBuffer;
