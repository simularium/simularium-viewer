import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Color, Vector2 } from "three";
import RenderToBuffer from "./RenderToBuffer";

var BlurXPass = /*#__PURE__*/function () {
  function BlurXPass() {
    _classCallCheck(this, BlurXPass);

    _defineProperty(this, "pass", void 0);

    this.pass = new RenderToBuffer({
      uniforms: {
        size: {
          value: new Vector2(2, 2)
        },
        colorTex: {
          value: null
        },
        viewPosTex: {
          value: null
        },
        amount: {
          value: 2
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform sampler2D viewPosTex;\n            // \"radius\" in framebuffer pixels\n            uniform float amount;\n            uniform vec2 size;\n            \n            //layout(location = 0) out vec4 out_col;\n            \n            void main(void)\n            {\n                vec2 texCoords = vUv;\n                float step = 1.0 / (size.x);\n            \n                vec4 texel, color = vec4(0.0);\n                int i;\n                float w, sum = 0.0;\n            \n                // in view space depth coordinates\n                const float depthThreshold = 1.0;//0.0001;\n            \n                if (amount == 0.0)\n                {\n                    color = texture(colorTex, texCoords);\n                    sum = 1.0;\n                }\n                else\n                {\n                    int iAmount = int((amount) + 1.0);\n                    float currentDepth = texture(viewPosTex, texCoords).z;\n                    for (i = -iAmount; i <= iAmount; i++)\n                    {\n                        float sampleDepth = texture(viewPosTex, texCoords + vec2(float(i) * step, 0.0)).z;\n                        if (abs(currentDepth - sampleDepth) < depthThreshold) {\n                            texel = texture(colorTex, texCoords + vec2(float(i) * step, 0.0));\n                            w = exp(-pow(float(i) / amount * 1.5, 2.0));\n                            //w = 1.0;\n                            color += texel * w;\n                            sum += w;\n                        }\n                    }\n                }\n            \n                //out_col = color / sum;\n                gl_FragColor = color / sum;\n            }\n                        "
    });
  }

  _createClass(BlurXPass, [{
    key: "resize",
    value: function resize(x, y) {
      this.pass.material.uniforms.size.value = new Vector2(x, y);
    }
  }, {
    key: "render",
    value: function render(renderer, tgt) {
      this.pass.render(renderer, tgt);
    }
  }]);

  return BlurXPass;
}();

var BlurYPass = /*#__PURE__*/function () {
  function BlurYPass() {
    _classCallCheck(this, BlurYPass);

    _defineProperty(this, "pass", void 0);

    this.pass = new RenderToBuffer({
      uniforms: {
        size: {
          value: new Vector2(2, 2)
        },
        colorTex: {
          value: null
        },
        viewPosTex: {
          value: null
        },
        amount: {
          value: 2
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform sampler2D viewPosTex;\n            // \"radius\" in framebuffer pixels\n            uniform float amount;\n            uniform vec2 size;\n            \n            //layout(location = 0) out vec4 out_col;\n            \n            void main(void)\n            {\n                vec2 texCoords = vUv;\n                float step = 1.0 / (size.y);\n            \n                vec4 texel, color = vec4(0.0);\n                int i;\n                float w, sum = 0.0;\n            \n                // in view space depth coordinates\n                const float depthThreshold = 1.0;//0.0001;\n            \n                if (amount == 0.0)\n                {\n                    color = texture(colorTex, texCoords);\n                    sum = 1.0;\n                }\n                else\n                {\n                    int iAmount = int((amount) + 1.0);\n                    float currentDepth = texture(viewPosTex, texCoords).z;\n                    for (i = -iAmount; i <= iAmount; i++)\n                    {\n                        float sampleDepth = texture(viewPosTex, texCoords + vec2(0.0, float(i) * step)).z;\n                        if (abs(currentDepth - sampleDepth) < depthThreshold) {\n                            texel = texture(colorTex, texCoords + vec2(0.0, float(i) * step));\n                            w = exp(-pow(float(i) / amount * 1.5, 2.0));\n                            //w = 1.0;\n                            color += texel * w;\n                            sum += w;\n                        }\n                    }\n                }\n            \n                //out_col = color / sum;\n                gl_FragColor = color / sum;\n            }\n                                    "
    });
  }

  _createClass(BlurYPass, [{
    key: "resize",
    value: function resize(x, y) {
      this.pass.material.uniforms.size.value = new Vector2(x, y);
    }
  }, {
    key: "render",
    value: function render(renderer, tgt) {
      this.pass.render(renderer, tgt);
    }
  }]);

  return BlurYPass;
}();

var BlurPass = /*#__PURE__*/function () {
  function BlurPass(radius) {
    _classCallCheck(this, BlurPass);

    _defineProperty(this, "blurXpass", void 0);

    _defineProperty(this, "blurYpass", void 0);

    this.blurXpass = new BlurXPass();
    this.blurYpass = new BlurYPass();
    this.setRadius(radius);
  }

  _createClass(BlurPass, [{
    key: "resize",
    value: function resize(x, y) {
      this.blurXpass.resize(x, y);
      this.blurYpass.resize(x, y);
    }
  }, {
    key: "setRadius",
    value: function setRadius(r) {
      this.blurXpass.pass.material.uniforms.amount.value = r;
      this.blurYpass.pass.material.uniforms.amount.value = r;
    }
  }, {
    key: "render",
    value: function render(renderer, target, source, positions, intermediateBuffer) {
      var c = renderer.getClearColor(new Color()).clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new Color(1.0, 1.0, 1.0), 1.0); // blur src into dest in two passes with an intermediate buffer (separable filter)
      // x = ( src,  viewpos ) --> intermediate
      // y = ( intermediate, viewpos ) --> dest

      this.blurXpass.pass.material.uniforms.colorTex.value = source.texture;
      this.blurXpass.pass.material.uniforms.viewPosTex.value = positions;
      this.blurXpass.render(renderer, intermediateBuffer);
      this.blurYpass.pass.material.uniforms.colorTex.value = intermediateBuffer.texture;
      this.blurYpass.pass.material.uniforms.viewPosTex.value = positions;
      this.blurYpass.render(renderer, target);
      renderer.setClearColor(c, a);
    }
  }]);

  return BlurPass;
}();

export default BlurPass;