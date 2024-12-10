import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Color, Vector2 } from "three";
import RenderToBuffer from "./RenderToBuffer.js";
var BlurPass1D = /*#__PURE__*/function () {
  function BlurPass1D(uvOffset, radius, stdDev) {
    _classCallCheck(this, BlurPass1D);
    _defineProperty(this, "pass", void 0);
    _defineProperty(this, "uvOffset", void 0);
    _defineProperty(this, "radius", void 0);
    _defineProperty(this, "stdDev", void 0);
    this.uvOffset = uvOffset;
    this.radius = 0;
    this.stdDev = 0;
    this.pass = new RenderToBuffer({
      defines: {
        KERNEL_RADIUS: 8
      },
      uniforms: {
        colorTex: {
          value: null
        },
        viewPosTex: {
          value: null
        },
        size: {
          value: new Vector2(512, 512)
        },
        sampleUvOffsets: {
          value: [new Vector2(0, 0)]
        },
        sampleWeights: {
          value: [1.0]
        },
        depthCutoff: {
          value: 0.1
        } // view space
      },
      fragmentShader: /* glsl */"\n\n        uniform sampler2D colorTex;\n        uniform sampler2D viewPosTex;\n\n        uniform float depthCutoff;\n\n        uniform vec2 sampleUvOffsets[ KERNEL_RADIUS + 1 ];\n        uniform float sampleWeights[ KERNEL_RADIUS + 1 ];\n\n        varying vec2 vUv;\n        uniform vec2 size; // iResolution.xy\n\n        void main() {\n            vec4 viewPos4 = texture2D(viewPosTex, vUv);\n            if (viewPos4.w < 1.0) discard;\n\n            float centerViewZ = -viewPos4.z;\n            bool rBreak = false, lBreak = false;\n\n            float weightSum = sampleWeights[0];\n            vec4 diffuseSum = texture2D( colorTex, vUv ) * weightSum;\n\n            vec2 vInvSize = 1.0 / size;\n\n            for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {\n\n                float sampleWeight = sampleWeights[i];\n                vec2 sampleUvOffset = sampleUvOffsets[i] * vInvSize;\n\n                vec2 sampleUv = vUv + sampleUvOffset;\n                float viewZ = -texture2D(viewPosTex, sampleUv).z;\n\n                if( abs( viewZ - centerViewZ ) > depthCutoff ) rBreak = true;\n\n                if( ! rBreak ) {\n                    diffuseSum += texture2D( colorTex, sampleUv ) * sampleWeight;\n                    weightSum += sampleWeight;\n                }\n\n                sampleUv = vUv - sampleUvOffset;\n                viewZ = -texture2D(viewPosTex, sampleUv).z;\n\n                if( abs( viewZ - centerViewZ ) > depthCutoff ) lBreak = true;\n\n                if( ! lBreak ) {\n                    diffuseSum += texture2D( colorTex, sampleUv ) * sampleWeight;\n                    weightSum += sampleWeight;\n                }\n\n            }\n\n            gl_FragColor = diffuseSum / weightSum;\n        }"
    });
    this.configure(radius, stdDev);
  }
  return _createClass(BlurPass1D, [{
    key: "resize",
    value: function resize(x, y) {
      this.pass.material.uniforms.size.value = new Vector2(x, y);
    }
  }, {
    key: "render",
    value: function render(renderer, tgt) {
      this.pass.render(renderer, tgt);
    }
  }, {
    key: "createSampleWeights",
    value: function createSampleWeights(kernelRadius, stdDev) {
      var weights = [];
      for (var i = 0; i <= kernelRadius; i++) {
        weights.push(gaussian(i, stdDev));
      }
      return weights;
    }
  }, {
    key: "createSampleOffsets",
    value: function createSampleOffsets(kernelRadius, uvIncrement) {
      var offsets = [];
      for (var i = 0; i <= kernelRadius; i++) {
        offsets.push(uvIncrement.clone().multiplyScalar(i));
      }
      return offsets;
    }
  }, {
    key: "configure",
    value: function configure(kernelRadius, stdDev) {
      if (kernelRadius !== this.radius || stdDev !== this.stdDev) {
        this.pass.material.defines["KERNEL_RADIUS"] = kernelRadius;
        this.pass.material.uniforms["sampleUvOffsets"].value = this.createSampleOffsets(kernelRadius, this.uvOffset);
        this.pass.material.uniforms["sampleWeights"].value = this.createSampleWeights(kernelRadius, stdDev);
        this.pass.material.needsUpdate = true;
        this.radius = kernelRadius;
        this.stdDev = stdDev;
      }
    }
  }]);
}();
function gaussian(x, stdDev) {
  return Math.exp(-(x * x) / (2.0 * (stdDev * stdDev))) / (Math.sqrt(2.0 * Math.PI) * stdDev);
}
var BlurPass = /*#__PURE__*/function () {
  function BlurPass(radius, stdDev) {
    _classCallCheck(this, BlurPass);
    _defineProperty(this, "blurXpass", void 0);
    _defineProperty(this, "blurYpass", void 0);
    this.blurXpass = new BlurPass1D(new Vector2(1.0, 0.0), radius, stdDev);
    this.blurYpass = new BlurPass1D(new Vector2(0.0, 1.0), radius, stdDev);
  }
  return _createClass(BlurPass, [{
    key: "resize",
    value: function resize(x, y) {
      this.blurXpass.resize(x, y);
      this.blurYpass.resize(x, y);
    }
  }, {
    key: "configure",
    value: function configure(radius, stdDev, depthCutoff) {
      this.blurXpass.configure(radius, stdDev);
      this.blurXpass.pass.material.uniforms.depthCutoff.value = depthCutoff;
      this.blurYpass.configure(radius, stdDev);
      this.blurYpass.pass.material.uniforms.depthCutoff.value = depthCutoff;
    }
  }, {
    key: "render",
    value: function render(renderer, target, source, positions, intermediateBuffer) {
      var c = renderer.getClearColor(new Color()).clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new Color(1.0, 1.0, 1.0), 1.0);

      // blur src into dest in two passes with an intermediate buffer (separable filter)

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
}();
export default BlurPass;