import { Texture, WebGLRenderer } from "three";
export default class HitTestHelper {
    private hitTestBuffer;
    private hitTestScene;
    private hitTestCamera;
    private hitTestVertexShader;
    private hitTestFragmentShader;
    private hitTestMesh;
    constructor();
    hitTest(renderer: WebGLRenderer, idBuffer: Texture, x: number, y: number): Float32Array;
}
