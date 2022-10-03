"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _RenderToBuffer = _interopRequireDefault(require("./RenderToBuffer"));

var _three = require("three");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var SSAO1Pass = /*#__PURE__*/function () {
  function SSAO1Pass(radius, threshold, falloff) {
    _classCallCheck(this, SSAO1Pass);

    _defineProperty(this, "pass", void 0);

    this.pass = new _RenderToBuffer.default({
      uniforms: {
        iResolution: {
          value: new _three.Vector2(2, 2)
        },
        iTime: {
          value: 0.0
        },
        normalTex: {
          value: null
        },
        viewPosTex: {
          value: null
        },
        noiseTex: {
          value: this.createNoiseTex()
        },
        iChannelResolution0: {
          value: new _three.Vector2(2, 2)
        },
        projectionMatrix: {
          value: new _three.Matrix4()
        },
        width: {
          value: 2
        },
        height: {
          value: 2
        },
        radius: {
          value: radius
        },
        ssaoThreshold: {
          value: threshold
        },
        // = 0.5;
        ssaoFalloff: {
          value: falloff
        },
        // = 0.1;
        samples: {
          value: this.createSSAOSamples()
        }
      },
      fragmentShader: "\n            uniform float iTime;\n            uniform vec2 iResolution;\n            uniform vec2 iChannelResolution0;\n            varying vec2 vUv;\n\n            uniform sampler2D normalTex;\n            uniform sampler2D viewPosTex;\n            uniform sampler2D noiseTex;\n            uniform vec3 samples[64];\n            uniform mat4 projectionMatrix;\n            \n            uniform float width;\n            uniform float height;\n            \n            //~ SSAO settings\n            uniform float radius;\n            uniform float ssaoThreshold; // = 0.5;\n            uniform float ssaoFalloff; // = 0.1;\n            \n            //layout(location = 0) out vec4 ssao_output;\n            \n            int kernelSize = 64;\n            \n            void main(void)\n            {\n                vec2 texCoords = vUv;\n              //debug\n              //ssao_output = vec4(1);\n              //return;\n              vec2 noiseScale = vec2(width / 4.0, height / 4.0);\n              vec4 viewPos4 = texture(viewPosTex, texCoords).xyzw;\n              if (viewPos4.w < 1.0) discard; // testing if this fragment has protein rendered on it, otherwise it's bg\n            \n              vec3 viewPos = viewPos4.xyz;\n              vec3 normal = texture(normalTex, texCoords).xyz;\n              vec3 randomVec = texture(noiseTex, texCoords * noiseScale).xyz;\n            \n              normal = normalize(normal * 2.0 - 1.0);\n              vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));\n              vec3 bitangent = cross(normal, tangent);\n              mat3 TBN = mat3(tangent, bitangent, normal);\n            \n              float occlusion = 0.0;\n            \n              for(int i = 0; i < kernelSize; i++)\n              {\n                vec3 posSample = TBN * samples[i];\n                posSample = viewPos + posSample * radius;\n            \n                vec4 offset = vec4(posSample, 1.0);\n                offset = projectionMatrix * offset;\n                offset.xy /= offset.w;\n                offset.xy = offset.xy * 0.5 + 0.5;\n            \n                vec4 sampleViewPos = texture(viewPosTex, offset.xy);\n                float sampleDepth = sampleViewPos.z;\n                float rangeCheck = smoothstep(0.0, 1.0, radius / abs(viewPos.z - sampleDepth));\n                occlusion += (sampleDepth >= posSample.z ? 1.0 : 0.0) * rangeCheck;\n              }\n            \n              //gl_FragColor = vec4(1.0 - occlusion/ float(kernelSize), 1.0 - occlusion / float(kernelSize), 1.0 - occlusion / float(kernelSize), 1.0);\n              //return;\n\n              float occlusion_weight = smoothstep(ssaoThreshold - ssaoFalloff, ssaoThreshold, length(viewPos));\n              occlusion_weight = 1.0 - occlusion_weight;\n              occlusion_weight *= 0.95;\n              occlusion = 1.0 - ((occlusion_weight * occlusion) / float(kernelSize));\n              //ssao_output = vec4(occlusion, occlusion, occlusion, 1.0);\n              gl_FragColor = vec4(occlusion, occlusion, occlusion, 1.0);\n            }\n            "
    });
  }

  _createClass(SSAO1Pass, [{
    key: "resize",
    value: function resize(x, y) {
      this.pass.material.uniforms.iResolution.value = new _three.Vector2(x, y);
      this.pass.material.uniforms.width.value = x;
      this.pass.material.uniforms.height.value = y;
    }
  }, {
    key: "setRadius",
    value: function setRadius(value) {
      this.pass.material.uniforms.radius.value = value;
    }
  }, {
    key: "render",
    value: function render(renderer, camera, target, normals, positions) {
      this.pass.material.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.pass.material.uniforms.viewPosTex.value = positions.texture;
      this.pass.material.uniforms.normalTex.value = normals.texture;
      var c = renderer.getClearColor().clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new _three.Color(1.0, 0.0, 0.0), 1.0);
      this.pass.render(renderer, target);
      renderer.setClearColor(c, a);
    }
  }, {
    key: "createNoiseTex",
    value: function createNoiseTex() {
      var noisedata = new Float32Array(16 * 4);

      for (var i = 0; i < 16; i++) {
        noisedata[i * 4 + 0] = Math.random() * 2.0 - 1.0;
        noisedata[i * 4 + 1] = Math.random() * 2.0 - 1.0;
        noisedata[i * 4 + 2] = 0;
        noisedata[i * 4 + 3] = 0;
      } // TODO half float type?


      return new _three.DataTexture(noisedata, 4, 4, _three.RGBAFormat, _three.FloatType);
    }
  }, {
    key: "createSSAOSamples",
    value: function createSSAOSamples() {
      var samples = [];

      for (var i = 0; i < 64; i++) {
        var sample = new _three.Vector3(Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random());
        sample.normalize();
        sample.multiplyScalar(Math.random());
        samples.push(sample);
      }

      return samples;
    }
  }]);

  return SSAO1Pass;
}();

var _default = SSAO1Pass;
exports.default = _default;