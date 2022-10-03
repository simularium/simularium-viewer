import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Color, DataTexture, FloatType, RGBAFormat, Vector3 } from "three";
import RenderToBuffer from "./RenderToBuffer";

var CompositePass = /*#__PURE__*/function () {
  function CompositePass(bgHCLoffset) {
    _classCallCheck(this, CompositePass);

    _defineProperty(this, "pass", void 0);

    this.pass = new RenderToBuffer({
      uniforms: {
        colorTex: {
          value: null
        },
        ssaoTex1: {
          value: null
        },
        ssaoTex2: {
          value: null
        },
        // colors indexed by particle type id
        colorsBuffer: {
          value: null
        },
        backgroundColor: {
          value: new Color(1, 1, 1)
        },
        bgHCLoffset: bgHCLoffset ? {
          value: new Vector3(bgHCLoffset.x, bgHCLoffset.y, bgHCLoffset.z)
        } : {
          value: new Vector3(1.0, 0.0, 0.2)
        },
        zNear: {
          value: 0.1
        },
        zFar: {
          value: 1000
        },
        atomicBeginDistance: {
          value: 150
        },
        chainBeginDistance: {
          value: 300
        },
        followedInstance: {
          value: -1
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform sampler2D ssaoTex1;\n            uniform sampler2D ssaoTex2;\n\n            uniform sampler2D colorsBuffer;\n            \n            uniform float zNear;\n            uniform float zFar;\n            uniform vec3 backgroundColor;\n            uniform vec3 bgHCLoffset;\n\n            // a single instance to get a special highlight\n            uniform float followedInstance;\n            \n            uniform float atomicBeginDistance; // = 100.0;\n            uniform float chainBeginDistance; // = 150.0;\n                                                \n            const float HCLgamma_ = 3.0;\n            const float HCLy0_ = 100.0;\n            const float HCLmaxL_ = 0.530454533953517;\n\n            vec3 hcl2rgb(in vec3 HCL)\n            {\n              vec3 RGB = vec3(0.0, 0.0, 0.0);\n              if (HCL.z != 0.0) {\n                float H = HCL.x;\n                float C = HCL.y;\n                float L = HCL.z * HCLmaxL_;\n                float Q = exp((1.0 - C / (2.0 * L)) * (HCLgamma_ / HCLy0_));\n                float U = (2.0 * L - C) / (2.0 * Q - 1.0);\n                float V = C / Q;\n                float T = tan((H + min(fract(2.0 * H) / 4.0, fract(-2.0 * H) / 8.0)) * 6.283185307);\n                H *= 6.0;\n                if (H <= 1.0) {\n                  RGB.r = 1.0;\n                  RGB.g = T / (1.0 + T);\n                }\n                else if (H <= 2.0) {\n                  RGB.r = (1.0 + T) / T;\n                  RGB.g = 1.0;\n                }\n                else if (H <= 3.0) {\n                  RGB.g = 1.0;\n                  RGB.b = 1.0 + T;\n                }\n                else if (H <= 4.0) {\n                  RGB.g = 1.0 / (1.0 + T);\n                  RGB.b = 1.0;\n                }\n                else if (H <= 5.0) {\n                  RGB.r = -1.0 / T;\n                  RGB.b = 1.0;\n                }\n                else {\n                  RGB.r = 1.0;\n                  RGB.b = -T;\n                }\n                return RGB * V + U;\n              }\n              return RGB;\n            }\n\n            vec3 rgb2hcl(in vec3 RGB) {\n              vec3 HCL = vec3(0.0, 0.0, 0.0);\n              float H = 0.0;\n              float U, V;\n              U = -min(RGB.r, min(RGB.g, RGB.b));\n              V = max(RGB.r, max(RGB.g, RGB.b));\n              float Q = HCLgamma_ / HCLy0_;\n              HCL.y = V + U;\n              if (HCL.y != 0.0)\n              {\n                H = atan(RGB.g - RGB.b, RGB.r - RGB.g) / 3.14159265;\n                Q *= -U / V;\n              }\n              Q = exp(Q);\n              HCL.x = fract(H / 2.0 - min(fract(H), fract(-H)) / 6.0);\n              HCL.y *= Q;\n              HCL.z = mix(U, V, Q) / (HCLmaxL_ * 2.0);\n              return HCL;\n            }\n                        \n            float LinearEyeDepth(float z_b)\n            {\n                float z_n = 2.0 * z_b - 1.0;\n                float z_e = 2.0 * zNear * zFar / (zFar + zNear - z_n * (zFar - zNear));\n                return z_e;\n            }\n            \n            void main(void)\n            {\n                vec2 texCoords = vUv;\n                // contains IDs.  index into data buffer.\n                // typeId, instanceId, viewZ\n                vec4 col0 = texture(colorTex, texCoords);\n                // check for uninitialized (set to clear value which was negative to indicate nothing drawn here to colorize)\n                if (col0.w < 0.0) {\n                    discard;\n                }\n                float occ1 = texture(ssaoTex1, texCoords).r;\n                float occ2 = texture(ssaoTex2, texCoords).r;\n                float instanceId = (col0.y);\n            \n                if(instanceId < 0.0)\n                    discard;\n            \n                // Subtracting 1 because we added 1 before setting this, to account for id 0 being highlighted.\n                // rounding because on some platforms (at least one nvidia+windows) int(abs(...)) is returning values that fluctuate\n                int agentColorIndex = int(round(abs(col0.x))-1.0);\n                // future: can use this value to do other rendering\n                //float highlighted = (sign(col0.x) + 1.0) * 0.5;\n\n                ivec2 ncols = textureSize(colorsBuffer, 0);\n                vec4 col = texelFetch(colorsBuffer, ivec2(agentColorIndex % ncols.x, 0), 0);\n\n                float eyeDepth = -col0.z;\n\n                vec3 atomColor = col.xyz;\n            \n                // background color as HCL\n                vec3 bghcl = rgb2hcl(backgroundColor);\n\n                //inital Hue-Chroma-Luminance\n\n                // atom color in HCL\n                vec3 hcl = rgb2hcl(col.xyz);\n                float h = hcl.r;\n                float c = hcl.g;\n                float l = hcl.b;\n\n                // per-pixel BG is related to atom color\n                bghcl = mix(bghcl, hcl, bgHCLoffset);\n                h = bghcl.r;\n                c = bghcl.g;\n                l = bghcl.b;\n\n                // chainBeginDistance should be > atomicBeginDistance\n\n                if(eyeDepth < chainBeginDistance)\n                {\n                    float cc = max(eyeDepth - atomicBeginDistance, 0.0);\n                    float dd = chainBeginDistance - atomicBeginDistance;\n                    float ddd = min(1.0, max(cc/dd, 0.0));\n                    ddd = (1.0-(ddd));\n                    l = mix(bghcl.z, hcl.z, ddd);\n                    c = mix(bghcl.y, hcl.y, ddd);\n                    h = mix(bghcl.x, hcl.x, ddd);\n                }\n                        \n                vec3 color;\n                color = hcl2rgb(vec3(h, c, l));\n\n                color = max(color, vec3(0.0,0.0,0.0));\n                color = min(color, vec3(1.0,1.0,1.0));\n                \n                if(eyeDepth < atomicBeginDistance)\n                {\n                    float t = (eyeDepth/atomicBeginDistance);\n                    t = 1.0 - clamp(t, 0.0, 1.0);\n                    // inside of atomicBeginDistance:\n                    // near is atomColor, far is color.xyz\n                    // linear RGB interp? not HCL?\n                    color.xyz = mix(color.xyz, atomColor, t);\n                    //color.xyz = atomColor;\n                    //color.xyz = vec3(0.0, 1.0, 0.0);\n                }\n            \n                gl_FragColor = vec4( occ1 * occ2 * color.xyz, 1.0);\n            }\n            "
    });
  } // colorsData is a Float32Array of rgba


  _createClass(CompositePass, [{
    key: "updateColors",
    value: function updateColors(numColors, colorsData) {
      this.pass.material.uniforms.colorsBuffer.value = new DataTexture(colorsData, numColors, 1, RGBAFormat, FloatType);
    }
  }, {
    key: "setBgHueOffset",
    value: function setBgHueOffset(value) {
      this.pass.material.uniforms.bgHCLoffset.value.x = value;
    }
  }, {
    key: "setBgChromaOffset",
    value: function setBgChromaOffset(value) {
      this.pass.material.uniforms.bgHCLoffset.value.y = value;
    }
  }, {
    key: "setBgLuminanceOffset",
    value: function setBgLuminanceOffset(value) {
      this.pass.material.uniforms.bgHCLoffset.value.z = value;
    }
  }, {
    key: "setBackgroundColor",
    value: function setBackgroundColor(color) {
      this.pass.material.uniforms.backgroundColor.value = color;
    }
  }, {
    key: "setFollowedInstance",
    value: function setFollowedInstance(instance) {
      this.pass.material.uniforms.followedInstance.value = instance;
    } // eslint-disable-next-line @typescript-eslint/no-unused-vars

  }, {
    key: "resize",
    value: function resize(x, y) {
      /* do nothing */
    }
  }, {
    key: "render",
    value: function render(renderer, camera, target, ssaoBuffer1, ssaoBuffer2, colorBuffer) {
      this.pass.material.uniforms.zNear.value = camera.near;
      this.pass.material.uniforms.zFar.value = camera.far;
      this.pass.material.uniforms.colorTex.value = colorBuffer;
      this.pass.material.uniforms.ssaoTex1.value = ssaoBuffer1.texture;
      this.pass.material.uniforms.ssaoTex2.value = ssaoBuffer2.texture; // const c = renderer.getClearColor().clone();
      // const a = renderer.getClearAlpha();
      // renderer.setClearColor(
      //     new THREE.Color(0.121569, 0.13333, 0.17647),
      //     1.0
      // );

      this.pass.render(renderer, target); // renderer.setClearColor(c, a);
    }
  }]);

  return CompositePass;
}();

export default CompositePass;