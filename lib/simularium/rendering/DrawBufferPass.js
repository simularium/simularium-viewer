"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _three = require("three");

var _RenderToBuffer = _interopRequireDefault(require("./RenderToBuffer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var DrawBufferPass = /*#__PURE__*/function () {
  function DrawBufferPass() {
    _classCallCheck(this, DrawBufferPass);

    _defineProperty(this, "pass", void 0);

    this.pass = new _RenderToBuffer.default({
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


  _createClass(DrawBufferPass, [{
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
      var c = renderer.getClearColor().clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new _three.Color(1, 0, 0), 1.0);
      this.pass.render(renderer, target);
      renderer.setClearColor(c, a);
    }
  }]);

  return DrawBufferPass;
}();

var _default = DrawBufferPass;
exports.default = _default;