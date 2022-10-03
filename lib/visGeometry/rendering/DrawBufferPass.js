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

var _RenderToBuffer = _interopRequireDefault(require("./RenderToBuffer"));

var DrawBufferPass = /*#__PURE__*/function () {
  function DrawBufferPass() {
    (0, _classCallCheck2["default"])(this, DrawBufferPass);
    (0, _defineProperty2["default"])(this, "pass", void 0);
    this.pass = new _RenderToBuffer["default"]({
      uniforms: {
        colorTex: {
          value: null
        },
        scale: {
          value: new _three.Vector4(1, 1, 1, 1)
        },
        bias: {
          value: new _three.Vector4(0, 0, 0, 0)
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform vec4 scale;\n            uniform vec4 bias;\n            \n            void main(void)\n            {\n                vec2 texCoords = vUv;\n                vec4 col = texture(colorTex, texCoords);\n                gl_FragColor = col*scale + bias;\n            }\n            "
    });
  } // eslint-disable-next-line @typescript-eslint/no-unused-vars


  (0, _createClass2["default"])(DrawBufferPass, [{
    key: "resize",
    value: function resize(x, y) {
      /* do nothing */
    }
  }, {
    key: "setScale",
    value: function setScale(x, y, z, w) {
      this.pass.material.uniforms.scale.value = new _three.Vector4(x, y, z, w);
    }
  }, {
    key: "setBias",
    value: function setBias(x, y, z, w) {
      this.pass.material.uniforms.bias.value = new _three.Vector4(x, y, z, w);
    }
  }, {
    key: "render",
    value: function render(renderer, target, bufferToDraw) {
      this.pass.material.uniforms.colorTex.value = bufferToDraw.texture;
      var c = renderer.getClearColor(new _three.Color()).clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new _three.Color(1, 0, 0), 1.0);
      this.pass.render(renderer, target);
      renderer.setClearColor(c, a);
    }
  }]);
  return DrawBufferPass;
}();

var _default = DrawBufferPass;
exports["default"] = _default;