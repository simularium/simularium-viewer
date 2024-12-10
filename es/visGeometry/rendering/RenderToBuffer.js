import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial } from "three";
var RenderToBuffer = /*#__PURE__*/function () {
  function RenderToBuffer(paramsObj) {
    _classCallCheck(this, RenderToBuffer);
    _defineProperty(this, "scene", void 0);
    _defineProperty(this, "geometry", void 0);
    _defineProperty(this, "material", void 0);
    _defineProperty(this, "camera", void 0);
    _defineProperty(this, "mesh", void 0);
    // paramsobj should have:
    // fragmentShader
    // uniforms
    this.scene = new Scene();
    this.geometry = new PlaneGeometry(2, 2);

    // augment uniforms (and shader source?)
    this.material = new ShaderMaterial({
      vertexShader: ["varying vec2 vUv;", "void main()", "{", "vUv = uv;", "gl_Position = vec4( position, 1.0 );", "}"].join("\n"),
      fragmentShader: paramsObj.fragmentShader,
      uniforms: paramsObj.uniforms,
      defines: paramsObj.defines || {}
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
  return _createClass(RenderToBuffer, [{
    key: "render",
    value: function render(renderer, target) {
      renderer.setRenderTarget(target);
      renderer.render(this.scene, this.camera);
    }
  }]);
}();
export default RenderToBuffer;