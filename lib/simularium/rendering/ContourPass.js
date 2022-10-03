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

var ContourPass = /*#__PURE__*/function () {
  function ContourPass() {
    _classCallCheck(this, ContourPass);

    _defineProperty(this, "pass", void 0);

    this.pass = new _RenderToBuffer.default({
      uniforms: {
        colorTex: {
          value: null
        },
        instanceIdTex: {
          value: null
        },
        normalsTex: {
          value: null
        },
        followedInstance: {
          value: -1
        },
        outlineThickness: {
          value: 2.0
        },
        outlineAlpha: {
          value: 0.8
        },
        outlineColor: {
          value: new _three.Color(1, 1, 1)
        },
        followThickness: {
          value: 3.0
        },
        followAlpha: {
          value: 0.8
        },
        followColor: {
          value: new _three.Color(0.14, 1, 0)
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform sampler2D instanceIdTex;\n            uniform sampler2D normalsTex;\n            uniform float followedInstance;\n            uniform float outlineThickness;\n            uniform float followThickness;\n            uniform float followAlpha;\n            uniform float outlineAlpha;\n            uniform vec3 followColor;\n            uniform vec3 outlineColor;\n\n            bool isHighlighted(float typevalue) {\n              return (sign(typevalue) > 0.0);\n            }\n\n            void main(void)\n            {\n              vec4 col = texture(colorTex, vUv);\n              //output_col = col;\n              //return;\n            \n              ivec2 resolution = textureSize(colorTex, 0);\n            \n              vec2 pixelPos = vUv * vec2(float(resolution.x), float(resolution.y));\n              float wStep = 1.0 / float(resolution.x);\n              float hStep = 1.0 / float(resolution.y);\n            \n              vec4 instance = texture(instanceIdTex, vUv);\n              // instance.g is the agent id\n              int X = int(instance.g);\n              int R = int(texture(instanceIdTex, vUv + vec2(wStep, 0)).g);\n              int L = int(texture(instanceIdTex, vUv + vec2(-wStep, 0)).g);\n              int T = int(texture(instanceIdTex, vUv + vec2(0, hStep)).g);\n              int B = int(texture(instanceIdTex, vUv + vec2(0, -hStep)).g);\n            \n              vec4 finalColor = col;\n              if ( (X == R) && (X == L) && (X == T) && (X == B) )\n              {\n                //~ current pixel is NOT on the edge\n                finalColor = col;\n              }\n              else\n              {\n                //~ current pixel lies on the edge\n                // outline pixel color is a blackened version of the color\n                finalColor = mix(vec4(0,0,0,1), col, 0.8);\n\n              }\n\n              // instance.r is the type id\n              bool highlighted = isHighlighted(instance.r);\n              if (highlighted) {\n                float thickness = outlineThickness;\n                mat3 sx = mat3( \n                    1.0, 2.0, 1.0, \n                    0.0, 0.0, 0.0, \n                   -1.0, -2.0, -1.0 \n                );\n                mat3 sy = mat3( \n                    1.0, 0.0, -1.0, \n                    2.0, 0.0, -2.0, \n                    1.0, 0.0, -1.0 \n                );\n                mat3 I;\n                for (int i=0; i<3; i++) {\n                  for (int j=0; j<3; j++) {\n                    bool v = isHighlighted(\n                      texelFetch(instanceIdTex, \n                        ivec2(gl_FragCoord) + \n                        ivec2(\n                          (i-1)*int(thickness),\n                          (j-1)*int(thickness)\n                        ), \n                        0 ).r\n                    );\n                    I[i][j] = v ? 1.0 : 0.0; \n                  }\n                }\n                float gx = dot(sx[0], I[0]) + dot(sx[1], I[1]) + dot(sx[2], I[2]); \n                float gy = dot(sy[0], I[0]) + dot(sy[1], I[1]) + dot(sy[2], I[2]);\n\n                float g = sqrt(pow(gx, 2.0)+pow(gy, 2.0));\n                finalColor = mix(finalColor, vec4(outlineColor.rgb,1), g*outlineAlpha);\n\n              }\n\n\n\n              if (X >= 0 && X == int(followedInstance)) {\n                float thickness = followThickness;\n                R = int(texture(instanceIdTex, vUv + vec2(wStep*thickness, 0)).g);\n                L = int(texture(instanceIdTex, vUv + vec2(-wStep*thickness, 0)).g);\n                T = int(texture(instanceIdTex, vUv + vec2(0, hStep*thickness)).g);\n                B = int(texture(instanceIdTex, vUv + vec2(0, -hStep*thickness)).g);\n                if ( (X != R) || (X != L) || (X != T) || (X != B) )\n                {\n                  //~ current pixel lies on the edge\n                  // outline pixel color is a whitened version of the color\n                  finalColor = mix(vec4(followColor.rgb,1), col, 1.0-followAlpha);\n                }\n              }\n        \n              gl_FragDepth = instance.w >= 0.0 ? instance.w : 1.0;\n              gl_FragColor = finalColor;\n            }\n            "
    });
  } // eslint-disable-next-line @typescript-eslint/no-unused-vars


  _createClass(ContourPass, [{
    key: "resize",
    value: function resize(x, y) {
      /* do nothing */
    }
  }, {
    key: "setOutlineColor",
    value: function setOutlineColor(value) {
      this.pass.material.uniforms.outlineColor.value = new _three.Color(value[0] / 255.0, value[1] / 255.0, value[2] / 255.0);
    }
  }, {
    key: "setOutlineAlpha",
    value: function setOutlineAlpha(value) {
      this.pass.material.uniforms.outlineAlpha.value = value;
    }
  }, {
    key: "setOutlineThickness",
    value: function setOutlineThickness(value) {
      this.pass.material.uniforms.outlineThickness.value = value;
    }
  }, {
    key: "setFollowColor",
    value: function setFollowColor(value) {
      this.pass.material.uniforms.followColor.value = new _three.Color(value[0] / 255.0, value[1] / 255.0, value[2] / 255.0);
    }
  }, {
    key: "setFollowAlpha",
    value: function setFollowAlpha(value) {
      this.pass.material.uniforms.followAlpha.value = value;
    }
  }, {
    key: "setFollowOutlineThickness",
    value: function setFollowOutlineThickness(value) {
      this.pass.material.uniforms.followThickness.value = value;
    }
  }, {
    key: "setFollowedInstance",
    value: function setFollowedInstance(instance) {
      this.pass.material.uniforms.followedInstance.value = instance;
    }
  }, {
    key: "render",
    value: function render(renderer, target, colorBuffer, instanceIdBuffer, normalsBuffer) {
      // this render pass has to fill frag depth for future render passes
      this.pass.material.depthWrite = true;
      this.pass.material.depthTest = true;
      this.pass.material.uniforms.colorTex.value = colorBuffer.texture;
      this.pass.material.uniforms.instanceIdTex.value = instanceIdBuffer.texture;
      this.pass.material.uniforms.normalsTex.value = normalsBuffer.texture; // const c = renderer.getClearColor().clone();
      // const a = renderer.getClearAlpha();
      // renderer.setClearColor(new THREE.Color(1.0, 0.0, 0.0), 1.0);

      this.pass.render(renderer, target); // renderer.setClearColor(c, a);
    }
  }]);

  return ContourPass;
}();

var _default = ContourPass;
exports.default = _default;