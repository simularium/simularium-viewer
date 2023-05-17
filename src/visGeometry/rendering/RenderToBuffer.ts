import {
    IUniform,
    Mesh,
    OrthographicCamera,
    PlaneBufferGeometry,
    Scene,
    ShaderMaterial,
    WebGLRenderer,
    WebGLRenderTarget,
} from "three";

interface RenderToBufferParams {
    fragmentShader: string;
    uniforms: { [uniform: string]: IUniform };
    defines?: { [uniform: string]: number };
}

class RenderToBuffer {
    public scene: Scene;
    public geometry: PlaneBufferGeometry;
    public material: ShaderMaterial;
    public camera: OrthographicCamera;
    public mesh: Mesh;

    public constructor(paramsObj: RenderToBufferParams) {
        // paramsobj should have:
        // fragmentShader
        // uniforms
        this.scene = new Scene();
        this.geometry = new PlaneBufferGeometry(2, 2);

        // augment uniforms (and shader source?)
        this.material = new ShaderMaterial({
            vertexShader: [
                "varying vec2 vUv;",

                "void main()",
                "{",
                "vUv = uv;",
                "gl_Position = vec4( position, 1.0 );",
                "}",
            ].join("\n"),
            fragmentShader: paramsObj.fragmentShader,
            uniforms: paramsObj.uniforms,
            defines: paramsObj.defines,
        });

        // in order to guarantee the whole quad is drawn every time optimally:
        this.material.depthWrite = false;
        this.material.depthTest = false;

        this.mesh = new Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // quadCamera is simply the camera to help render the full screen quad (2 triangles),
        // It is an Orthographic camera that sits facing the view plane.
        // This camera will not move or rotate for the duration of the app.
        this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    public render(
        renderer: WebGLRenderer,
        target: WebGLRenderTarget | null
    ): void {
        renderer.setRenderTarget(target);
        renderer.render(this.scene, this.camera);
    }
}

export default RenderToBuffer;
