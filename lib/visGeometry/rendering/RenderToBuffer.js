"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _three = require("three");

var RenderToBuffer = /*#__PURE__*/function () {
  function RenderToBuffer(paramsObj) {
    (0, _classCallCheck2["default"])(this, RenderToBuffer);
    (0, _defineProperty2["default"])(this, "scene", void 0);
    (0, _defineProperty2["default"])(this, "geometry", void 0);
    (0, _defineProperty2["default"])(this, "material", void 0);
    (0, _defineProperty2["default"])(this, "camera", void 0);
    (0, _defineProperty2["default"])(this, "mesh", void 0);
    // paramsobj should have:
    // fragmentShader
    // uniforms
    this.scene = new _three.Scene();
    this.geometry = new _three.PlaneBufferGeometry(2, 2); // augment uniforms (and shader source?)

    this.material = new _three.ShaderMaterial({
      vertexShader: ["varying vec2 vUv;", "void main()", "{", "vUv = uv;", "gl_Position = vec4( position, 1.0 );", "}"].join("\n"),
      fragmentShader: paramsObj.fragmentShader,
      uniforms: paramsObj.uniforms
    }); // in order to guarantee the whole quad is drawn every time optimally:

    this.material.depthWrite = false;
    this.material.depthTest = false;
    this.mesh = new _three.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh); // quadCamera is simply the camera to help render the full screen quad (2 triangles),
    // It is an Orthographic camera that sits facing the view plane.
    // This camera will not move or rotate for the duration of the app.

    this.camera = new _three.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  (0, _createClass2["default"])(RenderToBuffer, [{
    key: "render",
    value: function render(renderer, target) {
      renderer.setRenderTarget(target);
      renderer.render(this.scene, this.camera);
    }
  }]);
  return RenderToBuffer;
}();

var _default = RenderToBuffer;
exports["default"] = _default;