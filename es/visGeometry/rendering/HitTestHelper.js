import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { FloatType, Mesh, NearestFilter, OrthographicCamera, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, Vector2, WebGLRenderTarget } from "three";
var HitTestHelper = /*#__PURE__*/function () {
  function HitTestHelper() {
    _classCallCheck(this, HitTestHelper);
    _defineProperty(this, "hitTestBuffer", void 0);
    _defineProperty(this, "hitTestScene", void 0);
    _defineProperty(this, "hitTestCamera", void 0);
    _defineProperty(this, "hitTestVertexShader", void 0);
    _defineProperty(this, "hitTestFragmentShader", void 0);
    _defineProperty(this, "hitTestMesh", void 0);
    this.hitTestBuffer = new WebGLRenderTarget(1, 1, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.hitTestScene = new Scene();
    this.hitTestCamera = new OrthographicCamera();
    this.hitTestVertexShader = "\n  \n    void main() {\n      gl_Position = vec4(position, 1.0);\n    }\n    ";
    this.hitTestFragmentShader = "\n    uniform vec2 pixel;\n    uniform sampler2D objectIdTexture;\n\n    void main() {\n      gl_FragColor = texture(objectIdTexture, pixel);\n    }\n    ";
    this.hitTestMesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
      vertexShader: this.hitTestVertexShader,
      fragmentShader: this.hitTestFragmentShader,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        pixel: {
          value: new Vector2(0.5, 0.5)
        },
        objectIdTexture: {
          value: null
        }
      }
    }));
    this.hitTestScene.add(this.hitTestMesh);
  }

  // Read the x,y pixel of the given idBuffer Texture object
  _createClass(HitTestHelper, [{
    key: "hitTest",
    value: function hitTest(renderer, idBuffer, x, y) {
      // Strategy:  because multiple render targets (MRT) are being used, and ThreeJS
      // doesn't allow direct reads from them, we render a single pixel from one of
      // the textures internal to the MRT.
      // This is done by building a single render target of size 1x1 to hold the pixel
      // we want to read.  We will copy into it using a gpu draw call, and then
      // use readRenderTargetPixels to get the data.

      var pixel = new Float32Array(4).fill(-1);
      // (typeId), (instanceId), fragViewPos.z, fragPosDepth;

      // tell the shader which texture to use, and which pixel to read from
      this.hitTestMesh.material.uniforms.objectIdTexture.value = idBuffer;
      this.hitTestMesh.material.uniforms.pixel.value = new Vector2(x, y);

      // "draw" the pixel into our hit test buffer
      renderer.setRenderTarget(this.hitTestBuffer);
      renderer.render(this.hitTestScene, this.hitTestCamera);
      renderer.setRenderTarget(null);

      // read the pixel out
      renderer.readRenderTargetPixels(this.hitTestBuffer, 0, 0, 1, 1, pixel);
      return pixel;
    }
  }]);
  return HitTestHelper;
}();
export { HitTestHelper as default };