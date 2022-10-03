function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import RenderToBuffer from "./RenderToBuffer";

var ContourPass =
/*#__PURE__*/
function () {
  function ContourPass() {
    _classCallCheck(this, ContourPass);

    _defineProperty(this, "pass", void 0);

    this.pass = new RenderToBuffer({
      uniforms: {
        colorTex: {
          value: null
        },
        instanceIdTex: {
          value: null
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform sampler2D instanceIdTex;\n\n            void main(void)\n            {\n              vec4 col = texture(colorTex, vUv);\n              //output_col = col;\n              //return;\n            \n              ivec2 resolution = textureSize(colorTex, 0);\n            \n              vec2 pixelPos = vUv * vec2(float(resolution.x), float(resolution.y));\n              float wStep = 1.0 / float(resolution.x);\n              float hStep = 1.0 / float(resolution.y);\n            \n              vec4 instance = texture(instanceIdTex, vUv);\n              int X = int(instance.g);\n              int R = int(texture(instanceIdTex, vUv + vec2(wStep, 0)).g);\n              int L = int(texture(instanceIdTex, vUv + vec2(-wStep, 0)).g);\n              int T = int(texture(instanceIdTex, vUv + vec2(0, hStep)).g);\n              int B = int(texture(instanceIdTex, vUv + vec2(0, -hStep)).g);\n            \n              vec4 finalColor;\n              if ( (X == R) && (X == L) && (X == T) && (X == B) )\n              { //~ current pixel is NOT on the edge\n                finalColor = col;\n              }\n              else\n              { //~ current pixel lies on the edge\n                finalColor = mix(vec4(0,0,0,1), col, 0.8);\n              }\n            \n              gl_FragDepth = instance.w >= 0.0 ? instance.w : 1.0;\n              gl_FragColor = finalColor;\n            }\n            "
    });
  } // eslint-disable-next-line @typescript-eslint/no-unused-vars


  _createClass(ContourPass, [{
    key: "resize",
    value: function resize(x, y) {}
  }, {
    key: "render",
    value: function render(renderer, target, colorBuffer, instanceIdBuffer) {
      // this render pass has to fill frag depth for future render passes
      this.pass.material.depthWrite = true;
      this.pass.material.depthTest = true;
      this.pass.material.uniforms.colorTex.value = colorBuffer.texture;
      this.pass.material.uniforms.instanceIdTex.value = instanceIdBuffer.texture; // const c = renderer.getClearColor().clone();
      // const a = renderer.getClearAlpha();
      // renderer.setClearColor(new THREE.Color(1.0, 0.0, 0.0), 1.0);

      this.pass.render(renderer, target); // renderer.setClearColor(c, a);
    }
  }]);

  return ContourPass;
}();

export default ContourPass;