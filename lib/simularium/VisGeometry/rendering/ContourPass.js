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

var ContourPass = /*#__PURE__*/function () {
  function ContourPass() {
    (0, _classCallCheck2["default"])(this, ContourPass);
    (0, _defineProperty2["default"])(this, "pass", void 0);
    this.pass = new _RenderToBuffer["default"]({
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
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform sampler2D instanceIdTex;\n            uniform sampler2D normalsTex;\n            uniform float followedInstance;\n            uniform float outlineThickness;\n            uniform float followThickness;\n            uniform float followAlpha;\n            uniform float outlineAlpha;\n            uniform vec3 followColor;\n            uniform vec3 outlineColor;\n\n            bool isHighlighted(float typevalue) {\n              return (sign(typevalue) > 0.0);\n            }\n\n            bool isSameInstance(float x, float y) {\n              // typeIds and instanceIds are integers written to float gpu buffers.\n              // This fudge factor is working around a strange float bug on nvidia/Windows hardware.\n              // The numbers read are noisy and not uniform across faces.\n              // I can't tell if the bug occurs on read or on write, but the workaround is\n              // needed here at read time when we need to do comparisons.\n              // (TODO: dump buffer after read to inspec?)\n              // Straight equality works on MacOS and Intel/Windows gpu \n              // This should be tested periodically with new nvidia drivers on windows\n              // TODO: try \"round(abs(x-y)) == 0\" here\n              return abs(x-y) < 0.1;\n            }\n            bool isAdjacentToSame(float x, float l, float r, float b, float t) {\n              return isSameInstance(x, l) && isSameInstance(x, r) && isSameInstance(x, b) && isSameInstance(x, t);\n            }\n\n            void main(void)\n            {\n              vec4 col = texture(colorTex, vUv);\n           \n              ivec2 resolution = textureSize(colorTex, 0);\n            \n              vec2 pixelPos = vUv * vec2(float(resolution.x), float(resolution.y));\n              float wStep = 1.0 / float(resolution.x);\n              float hStep = 1.0 / float(resolution.y);\n            \n              vec4 instance = texture(instanceIdTex, vUv);\n              // instance.g is the agent id\n              float X = instance.g;\n              float R = texture(instanceIdTex, vUv + vec2(wStep, 0)).g;\n              float L = texture(instanceIdTex, vUv + vec2(-wStep, 0)).g;\n              float T = texture(instanceIdTex, vUv + vec2(0, hStep)).g;\n              float B = texture(instanceIdTex, vUv + vec2(0, -hStep)).g;\n            \n              vec4 finalColor = col;\n              if (isAdjacentToSame(X, R, L, T, B) )\n              {\n                // current pixel is NOT on the edge\n                finalColor = col;\n              }\n              else\n              {\n                // current pixel lies on the edge of an agent\n                // outline pixel color is a darkened version of the color\n                finalColor = mix(vec4(0.0,0.0,0.0,1.0), col, 0.8);\n\n              }\n\n              // instance.r is the type id\n              bool highlighted = isHighlighted(instance.r);\n              if (highlighted) {\n                float thickness = outlineThickness;\n                mat3 sx = mat3( \n                    1.0, 2.0, 1.0, \n                    0.0, 0.0, 0.0, \n                   -1.0, -2.0, -1.0 \n                );\n                mat3 sy = mat3( \n                    1.0, 0.0, -1.0, \n                    2.0, 0.0, -2.0, \n                    1.0, 0.0, -1.0 \n                );\n                mat3 I;\n                for (int i=0; i<3; i++) {\n                  for (int j=0; j<3; j++) {\n                    bool v = isHighlighted(\n                      texelFetch(instanceIdTex, \n                        ivec2(gl_FragCoord) + \n                        ivec2(\n                          (i-1)*int(thickness),\n                          (j-1)*int(thickness)\n                        ), \n                        0 ).r\n                    );\n                    I[i][j] = v ? 1.0 : 0.0; \n                  }\n                }\n                float gx = dot(sx[0], I[0]) + dot(sx[1], I[1]) + dot(sx[2], I[2]); \n                float gy = dot(sy[0], I[0]) + dot(sy[1], I[1]) + dot(sy[2], I[2]);\n\n                float g = sqrt(pow(gx, 2.0)+pow(gy, 2.0));\n                finalColor = mix(finalColor, vec4(outlineColor.rgb,1), g*outlineAlpha);\n\n              }\n\n              if (X >= 0.0 && isSameInstance(X, followedInstance)) {\n                float thickness = followThickness;\n                R = (texture(instanceIdTex, vUv + vec2(wStep*thickness, 0)).g);\n                L = (texture(instanceIdTex, vUv + vec2(-wStep*thickness, 0)).g);\n                T = (texture(instanceIdTex, vUv + vec2(0, hStep*thickness)).g);\n                B = (texture(instanceIdTex, vUv + vec2(0, -hStep*thickness)).g);\n                if ( !isAdjacentToSame(X, R, L, T, B) )\n                {\n                  // current pixel lies on the edge of the followed agent\n                  // outline pixel color is blended toward the followColor\n                  finalColor = mix(vec4(followColor.rgb,1), col, 1.0-followAlpha);\n                }\n              }\n        \n              gl_FragDepth = instance.w >= 0.0 ? instance.w : 1.0;\n              gl_FragColor = finalColor;\n            }\n            "
    });
  } // eslint-disable-next-line @typescript-eslint/no-unused-vars


  (0, _createClass2["default"])(ContourPass, [{
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
      this.pass.material.uniforms.instanceIdTex.value = instanceIdBuffer;
      this.pass.material.uniforms.normalsTex.value = normalsBuffer; // const c = renderer.getClearColor().clone();
      // const a = renderer.getClearAlpha();
      // renderer.setClearColor(new THREE.Color(1.0, 0.0, 0.0), 1.0);

      this.pass.render(renderer, target); // renderer.setClearColor(c, a);
    }
  }]);
  return ContourPass;
}();

var _default = ContourPass;
exports["default"] = _default;