import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Color, Vector4 } from "three";
import RenderToBuffer from "./RenderToBuffer";
var DrawBufferPass = /*#__PURE__*/function () {
  function DrawBufferPass() {
    _classCallCheck(this, DrawBufferPass);
    _defineProperty(this, "pass", void 0);
    this.pass = new RenderToBuffer({
      uniforms: {
        colorTex: {
          value: null
        },
        scale: {
          value: new Vector4(1, 1, 1, 1)
        },
        bias: {
          value: new Vector4(0, 0, 0, 0)
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform vec4 scale;\n            uniform vec4 bias;\n            \n            void main(void)\n            {\n                vec2 texCoords = vUv;\n                vec4 col = texture(colorTex, texCoords);\n                gl_FragColor = col*scale + bias;\n            }\n            "
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _createClass(DrawBufferPass, [{
    key: "resize",
    value: function resize(x, y) {
      /* do nothing */
    }
  }, {
    key: "setScale",
    value: function setScale(x, y, z, w) {
      this.pass.material.uniforms.scale.value = new Vector4(x, y, z, w);
    }
  }, {
    key: "setBias",
    value: function setBias(x, y, z, w) {
      this.pass.material.uniforms.bias.value = new Vector4(x, y, z, w);
    }
  }, {
    key: "render",
    value: function render(renderer, target, bufferToDraw) {
      this.pass.material.uniforms.colorTex.value = bufferToDraw.texture;
      var c = renderer.getClearColor(new Color()).clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new Color(1, 0, 0), 1.0);
      this.pass.render(renderer, target);
      renderer.setClearColor(c, a);
    }
  }]);
  return DrawBufferPass;
}();
export default DrawBufferPass;