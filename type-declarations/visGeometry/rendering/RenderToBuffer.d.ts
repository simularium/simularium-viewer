import { IUniform, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderer, WebGLRenderTarget } from "three";
interface RenderToBufferParams {
    fragmentShader: string;
    uniforms: {
        [uniform: string]: IUniform;
    };
    defines?: {
        [uniform: string]: number;
    };
}
declare class RenderToBuffer {
    scene: Scene;
    geometry: PlaneGeometry;
    material: ShaderMaterial;
    camera: OrthographicCamera;
    mesh: Mesh;
    constructor(paramsObj: RenderToBufferParams);
    render(renderer: WebGLRenderer, target: WebGLRenderTarget | null): void;
}
export default RenderToBuffer;
