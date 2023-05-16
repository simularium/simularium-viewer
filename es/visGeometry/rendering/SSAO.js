import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import RenderToBuffer from "./RenderToBuffer";
import { Color, DataTexture, FloatType, Matrix4, RGBAFormat, Vector2, Vector3 } from "three";
var SSAO1Pass = /*#__PURE__*/function () {
  function SSAO1Pass(radius, threshold, falloff) {
    _classCallCheck(this, SSAO1Pass);
    _defineProperty(this, "pass", void 0);
    this.pass = new RenderToBuffer({
      uniforms: {
        iResolution: {
          value: new Vector2(2, 2)
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
        projectionMatrix: {
          value: new Matrix4()
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
      fragmentShader: "\n            uniform vec2 iResolution;\n            varying vec2 vUv;\n\n            uniform sampler2D normalTex;\n            uniform sampler2D viewPosTex;\n            uniform sampler2D noiseTex;\n            uniform vec3 samples[64];\n            uniform mat4 projectionMatrix;\n            \n            uniform float width;\n            uniform float height;\n            \n            //~ SSAO settings\n            uniform float radius;\n            uniform float ssaoThreshold; // = 0.5;\n            uniform float ssaoFalloff; // = 0.1;\n            \n            //layout(location = 0) out vec4 ssao_output;\n            \n            int kernelSize = 64;\n\n            void main(void)\n            {\n                vec2 texCoords = vUv;\n              //debug\n              //ssao_output = vec4(1);\n              //return;\n              vec2 noiseScale = vec2(width / 4.0, height / 4.0);\n              vec4 viewPos4 = texture(viewPosTex, texCoords).xyzw;\n              if (viewPos4.w < 1.0) discard; // testing if this fragment has protein rendered on it, otherwise it's bg\n            \n              vec3 viewPos = viewPos4.xyz;\n              vec3 normal = texture(normalTex, texCoords).xyz;\n              vec3 randomVec = texture(noiseTex, texCoords * noiseScale).xyz;\n            \n              normal = normalize(normal * 2.0 - 1.0);\n              vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));\n              vec3 bitangent = cross(normal, tangent);\n              mat3 TBN = mat3(tangent, bitangent, normal);\n            \n              float occlusion = 0.0;\n            \n              for(int i = 0; i < kernelSize; i++)\n              {\n                vec3 posSample = TBN * samples[i];\n                posSample = viewPos + posSample * radius;\n            \n                // transform sample to clip space\n                vec4 offset = vec4(posSample, 1.0);\n                offset = projectionMatrix * offset;\n                // perspective divide to get to ndc\n                offset.xy /= offset.w;\n                // and back to the (0,0)-(1,1) range\n                offset.xy = offset.xy * 0.5 + 0.5;\n            \n                vec4 sampleViewPos = texture(viewPosTex, offset.xy);\n                float sampleDepth = sampleViewPos.z;\n                float rangeCheck = smoothstep(0.0, 1.0, radius / abs(viewPos.z - sampleDepth));\n                occlusion += (sampleDepth >= posSample.z ? 1.0 : 0.0) * rangeCheck;\n              }\n            \n              //gl_FragColor = vec4(1.0 - occlusion/ float(kernelSize), 1.0 - occlusion / float(kernelSize), 1.0 - occlusion / float(kernelSize), 1.0);\n              //return;\n\n              float occlusion_weight = smoothstep(ssaoThreshold - ssaoFalloff, ssaoThreshold, length(viewPos));\n              occlusion_weight = 1.0 - occlusion_weight;\n              occlusion_weight *= 0.95;\n              occlusion = 1.0 - ((occlusion_weight * occlusion) / float(kernelSize));\n              //ssao_output = vec4(occlusion, occlusion, occlusion, 1.0);\n              gl_FragColor = vec4(occlusion, occlusion, occlusion, 1.0);\n            }\n            "
    });
  }
  _createClass(SSAO1Pass, [{
    key: "resize",
    value: function resize(x, y) {
      this.pass.material.uniforms.iResolution.value = new Vector2(x, y);
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
      this.pass.material.uniforms.viewPosTex.value = positions;
      this.pass.material.uniforms.normalTex.value = normals;
      var c = renderer.getClearColor(new Color()).clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new Color(1.0, 0.0, 0.0), 1.0);
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
      }
      // TODO half float type?
      var tex = new DataTexture(noisedata, 4, 4, RGBAFormat, FloatType);
      tex.needsUpdate = true;
      return tex;
    }
  }, {
    key: "createSSAOSamples",
    value: function createSSAOSamples() {
      var samples = [];
      for (var i = 0; i < 64; i++) {
        // hemisphere kernel in tangent space
        var sample = new Vector3(Math.random() * 2.0 - 1.0,
        // -1..1
        Math.random() * 2.0 - 1.0,
        // -1..1
        Math.random() // 0..1
        );

        sample.normalize();
        sample.multiplyScalar(Math.random());

        // Uncomment all this to try to get better samples
        // function lerp(x0: number, x1: number, alpha: number): number {
        //     return x0 + (x1 - x0) * alpha;
        // }
        // const iRelative = i / 64.0;
        // // scale samples s.t. they're more aligned to center of kernel
        // const scale = lerp(0.1, 1.0, iRelative * iRelative);
        // sample.multiplyScalar(scale);

        samples.push(sample);
      }
      return samples;
    }
  }]);
  return SSAO1Pass;
}();
export default SSAO1Pass;