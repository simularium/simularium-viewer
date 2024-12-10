import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import RenderToBuffer from "./RenderToBuffer.js";
import { Color, Vector2 } from "three";
var SSAO1Pass = /*#__PURE__*/function () {
  function SSAO1Pass() {
    _classCallCheck(this, SSAO1Pass);
    _defineProperty(this, "pass", void 0);
    this.pass = new RenderToBuffer({
      defines: {
        NUM_SAMPLES: 7,
        NUM_RINGS: 4
      },
      uniforms: {
        normalTex: {
          value: null
        },
        viewPosTex: {
          value: null
        },
        iResolution: {
          value: new Vector2(2, 2)
        },
        // 'size'

        cameraFar: {
          value: 100
        },
        scale: {
          value: 1.0
        },
        intensity: {
          value: 0.1
        },
        bias: {
          value: 0.5
        },
        minResolution: {
          value: 0.0
        },
        kernelRadius: {
          value: 100.0
        },
        randomSeed: {
          value: 0.0
        },
        beginFalloffDistance: {
          value: 0.0
        },
        endFalloffDistance: {
          value: 100.0
        }
      },
      fragmentShader: /* glsl */"\n\n                #include <common> // for pow2 and PI2\n\n                varying vec2 vUv;\n\n                uniform sampler2D viewPosTex;\n                uniform sampler2D normalTex;\n\n                uniform float cameraFar;\n\n                uniform float scale;\n                uniform float intensity;\n                uniform float bias;\n                uniform float kernelRadius;\n                uniform float minResolution;\n                uniform vec2 iResolution;// size;\n                uniform float randomSeed;\n                uniform float beginFalloffDistance;\n                uniform float endFalloffDistance;\n\n                vec3 getViewNormal( const in vec2 screenPosition ) {\n                    vec3 n = texture2D( normalTex, screenPosition ).xyz;\n                    return 2.0 * n - 1.0;\n                }\n\n                float scaleDividedByCameraFar;\n                float minResolutionMultipliedByCameraFar;\n\n                float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {\n                    vec3 viewDelta = sampleViewPosition - centerViewPosition;\n                    float viewDistance = length( viewDelta );\n                    float scaledScreenDistance = scaleDividedByCameraFar * viewDistance;\n\n                    return max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - bias) / (1.0 + pow2( scaledScreenDistance ) );\n                }\n\n                // moving costly divides into consts\n                const float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );\n                const float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );\n\n                float getAmbientOcclusion( const in vec3 centerViewPosition, const in float depthInterpolant ) {\n                    // precompute some variables require in getOcclusion.\n                    scaleDividedByCameraFar = scale / cameraFar;\n                    minResolutionMultipliedByCameraFar = minResolution * cameraFar;\n                    vec3 centerViewNormal = getViewNormal( vUv );\n\n                    // jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/\n                    float angle = rand( vUv + randomSeed ) * PI2;\n                    vec2 radius = vec2( kernelRadius * INV_NUM_SAMPLES ) / iResolution; // size;\n                    vec2 radiusStep = radius;\n\n                    float occlusionSum = 0.0;\n                    float weightSum = 0.0;\n\n                    for( int i = 0; i < NUM_SAMPLES; i ++ ) {\n                        vec2 sampleUv = vUv + vec2( cos( angle ), sin( angle ) ) * radius;\n                        radius += radiusStep;\n                        angle += ANGLE_STEP;\n\n                        vec4 viewPos4 = texture(viewPosTex, sampleUv).xyzw;\n                        // test if this fragment has any geometry rendered on it, otherwise it's bg\n                        if (viewPos4.w < 1.0) continue;\n                        vec3 sampleViewPosition = viewPos4.xyz;\n\n                        occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );\n                        weightSum += 1.0;\n                    }\n\n                    if( weightSum == 0.0 ) discard;\n\n                    float ambientOcclusion = occlusionSum * ( intensity / weightSum ) * (1.0-depthInterpolant);\n                    return clamp(ambientOcclusion, 0.0, 1.0);\n                }\n\n                void main() {\n                    vec4 viewPos4 = texture(viewPosTex, vUv).xyzw;\n                    // test if this fragment has any geometry rendered on it, otherwise it's bg\n                    if (viewPos4.w < 1.0) discard;\n\n                    vec3 viewPosition = viewPos4.xyz;\n                    float eyeZ = -viewPosition.z;\n                    float depthInterpolant = mix(0.0, 1.0, clamp((eyeZ-beginFalloffDistance)/(endFalloffDistance-beginFalloffDistance), 0.0, 1.0));\n                    //float depthInterpolant = smoothstep(beginFalloffDistance, endFalloffDistance, eyeZ);\n\n                    float ambientOcclusion = getAmbientOcclusion( viewPosition, depthInterpolant );\n\n                    gl_FragColor = vec4(vec3(1.0-ambientOcclusion), 1.0);\n                }"
    });
  }
  return _createClass(SSAO1Pass, [{
    key: "resize",
    value: function resize(x, y) {
      this.pass.material.uniforms.iResolution.value = new Vector2(x, y);
    }
  }, {
    key: "render",
    value: function render(renderer, camera, target, normals, positions) {
      this.pass.material.uniforms.viewPosTex.value = positions;
      this.pass.material.uniforms.normalTex.value = normals;
      var c = renderer.getClearColor(new Color()).clone();
      var a = renderer.getClearAlpha();
      renderer.setClearColor(new Color(1.0, 0.0, 0.0), 1.0);
      this.pass.render(renderer, target);
      renderer.setClearColor(c, a);
    }
  }]);
}();
export default SSAO1Pass;