function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import { Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial } from "three";

var RenderToBuffer =
/*#__PURE__*/
function () {
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
    this.geometry = new PlaneBufferGeometry(2, 2); // augment uniforms (and shader source?)

    this.material = new ShaderMaterial({
      vertexShader: ["varying vec2 vUv;", "void main()", "{", "vUv = uv;", "gl_Position = vec4( position, 1.0 );", "}"].join("\n"),
      fragmentShader: paramsObj.fragmentShader,
      uniforms: paramsObj.uniforms
    }); // in order to guarantee the whole quad is drawn every time optimally:

    this.material.depthWrite = false;
    this.material.depthTest = false;
    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh); // quadCamera is simply the camera to help render the full screen quad (2 triangles),
    // It is an Orthographic camera that sits facing the view plane.
    // This camera will not move or rotate for the duration of the app.

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  _createClass(RenderToBuffer, [{
    key: "render",
    value: function render(renderer, target) {
      renderer.setRenderTarget(target);
      renderer.render(this.scene, this.camera);
    }
  }]);

  return RenderToBuffer;
}();

export default RenderToBuffer;