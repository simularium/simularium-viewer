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

var CompositePass =
/*#__PURE__*/
function () {
  function CompositePass() {
    _classCallCheck(this, CompositePass);

    _defineProperty(this, "pass", void 0);

    this.pass = new _RenderToBuffer.default({
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
        atomIdTex: {
          value: null
        },
        instanceIdTex: {
          value: null
        },
        depthBufferTex: {
          value: null
        },
        // colors indexed by particle type id
        colorsBuffer: {
          value: null
        },
        backgroundColor: {
          value: new _three.Color(1, 1, 1)
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
          value: 225
        },
        highlightInstance: {
          value: -1
        }
      },
      fragmentShader: "\n            in vec2 vUv;\n            \n            uniform sampler2D colorTex;\n            uniform sampler2D ssaoTex1;\n            uniform sampler2D ssaoTex2;\n            uniform sampler2D atomIdTex;\n            uniform sampler2D instanceIdTex;\n            uniform sampler2D depthBufferTex;\n\n            uniform sampler2D colorsBuffer;\n            \n            uniform float zNear;\n            uniform float zFar;\n            uniform vec3 backgroundColor;\n\n            uniform float highlightInstance;\n            \n            uniform float atomicBeginDistance; // = 100.0;\n            uniform float chainBeginDistance; // = 150.0;\n\n            // layout(std430) buffer;\n            // layout(binding = 0) buffer INPUT0 {\n            //   vec4 AtomInfos[];\n            // };\n            \n            // layout(binding = 1) buffer INPUT1 {\n            //   vec4 ProteinInstanceInfo[];\n            // };\n            \n            // layout(binding = 2) buffer INPUT2 {\n            //    vec4 IngredientInfo[];\n            //  };\n            \n            //_ProteinAtomInfos\n            \n            //out vec4 out_color;\n            \n            float d3_lab_xyz(float x)\n            {\n                return x > 0.206893034 ? x * x * x : (x - 4.0 / 29.0) / 7.787037;\n            }\n            \n            float d3_xyz_rgb(float r)\n            {\n                return round(255.0 * (r <= 0.00304 ? 12.92 * r : 1.055 * pow(r, 1.0 / 2.4) - 0.055));\n            }\n\n            vec3 d3_lab_rgb(float l, float a, float b)\n            {\n                float y = (l + 16.0) / 116.0;\n                float x = y + a / 500.0;\n                float z = y - b / 200.0;\n            \n                x = d3_lab_xyz(x) * 0.950470;\n                y = d3_lab_xyz(y) * 1.0;\n                z = d3_lab_xyz(z) * 1.088830;\n            \n                return vec3(\n                    d3_xyz_rgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),\n                    d3_xyz_rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z),\n                    d3_xyz_rgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z)\n                );\n            }\n            \n            vec3 d3_hcl_lab(float h, float c, float l)\n            {\n                float d3_radians = 0.01745329252;\n                return d3_lab_rgb(l, cos(h * d3_radians) * c, sin(h * d3_radians) * c) / 255.0;\n            }\n            \n            vec3 IngredientColor[47] = vec3[](\n                vec3(1.0, 0.1, 0.1),\n                vec3(1.0, 0.4, 0.4),\n                vec3(1.0, 0.0, 0.0),\n                vec3(1.0, 0.2, 0.2),\n                vec3(1.0, 0.1, 0.1),\n                vec3(1.0, 0.1, 0.1),\n                vec3(1.0, 0.2, 0.2),\n                vec3(1.0, 0.3, 0.3),\n                vec3(1.0, 0.4, 0.4),\n                vec3(1.0, 0.2, 0.2),\n                vec3(1.0, 0.1, 0.1),\n                vec3(1.0, 0.1, 0.1),\n                vec3(1.0, 0.3, 0.3),\n                vec3(1.0, 0.4, 0.4),\n                vec3(1.0, 0.2, 0.2),\n                vec3(1.0, 0.1, 0.1),\n                vec3(1.0, 0.2, 0.2),\n                vec3(1.0, 0.2, 0.2),\n                vec3(1.0, 0.0, 0.0),\n                vec3(1.0, 0.9, 0.1),\n                vec3(1.0, 0.9, 0.5),\n                vec3(1.0, 0.9, 0.4),\n                vec3(1.0, 0.9, 0.4),\n                vec3(1.0, 0.9, 0.0),\n                vec3(0.4, 1.0, 0.3),\n                vec3(0.2, 1.0, 0.0),\n                vec3(0.2, 1.0, 0.0),\n                vec3(0.5, 1.0, 0.4),\n                vec3(0.4, 1.0, 0.3),\n                vec3(0.5, 1.0, 0.4),\n                vec3(0.5, 1.0, 0.3),\n                vec3(0.2, 1.0, 0.0),\n                vec3(0.2, 1.0, 0.0),\n                vec3(0.3, 1.0, 0.1),\n                vec3(0.4, 1.0, 0.3),\n                vec3(0.3, 1.0, 0.2),\n                vec3(0.4, 1.0, 0.2),\n                vec3(0.3, 1.0, 0.1),\n                vec3(0.2, 1.0, 0.0),\n                vec3(0.2, 1.0, 0.8),\n                vec3(0.5, 0.7, 1.0),\n                vec3(0.1, 0.5, 1.0),\n                vec3(0.0, 0.4, 1.0),\n                vec3(0.1, 0.5, 1.0),\n                vec3(0.2, 0.5, 1.0),\n                vec3(0.7, 0.2, 1.0),\n                vec3(0.8, 0.4, 1.0)\n            );\n            \n            vec3 IngredientColorHCL[48] = vec3[](\n                //blood plasma\n                vec3(35, 77, 70),\n                vec3(38, 70, 70),\n                vec3(30, 70, 75),\n                vec3(33, 77, 70),\n                vec3(35, 77, 70),\n                vec3(35, 77, 70),\n                vec3(35, 77, 70),\n                vec3(35, 77, 70),\n                vec3(25, 77, 70),\n                vec3(15, 77, 60),\n                vec3(35, 77, 50),\n                vec3(35, 77, 70),\n                vec3(35, 69, 40),\n                vec3(35, 77, 70),\n                vec3(35, 77, 70),\n                vec3(35, 77, 10),\n                vec3(35, 77, 70),\n                vec3(35, 77, 70),\n                vec3(35, 90, 50),\n                vec3(35, 77, 70),\n            \n                //surface proteins\n                vec3(54, 23, 75),\n            \n                //\n                vec3(290, 66, 62),\n                vec3(280, 60, 75),\n                vec3(275, 54, 79),\n                vec3(290, 70, 50),\n                vec3(290, 64, 55),\n                vec3(290, 61, 62),\n                vec3(290, 69, 61),\n                vec3(290, 71, 68),\n                vec3(290, 72, 65),\n                vec3(290, 60, 61),\n                vec3(290, 66, 62),\n                vec3(290, 66, 65),\n                vec3(290, 66, 68),\n                vec3(290, 66, 59),\n                vec3(290, 66, 75),\n                vec3(290, 66,80),\n                vec3(290, 66, 62),\n                vec3(290, 66, 62),\n                //capsid\n              //vec3(120, 110, 160),\n                vec3(150, 50, 50),\n                //\n                vec3(126, 61, 82),\n                vec3(126, 61, 82),\n                vec3(126, 61, 82),\n                vec3(126, 61, 82),\n                vec3(126, 61, 82),\n                vec3(25, 111, 82), // RNA\n                vec3(126, 61, 82), // membrane inner\n              vec3(126, 71, 72) // membrane outer\n            );\n            \n            vec3 AtomColors[7] = vec3[](\n                vec3(0.784, 0.784, 0.784),\n                vec3(1.0  , 1.0  ,1.0),\n                vec3(0.561, 0.561,1),\n                vec3(0.941, 0    ,0),\n                vec3(1    , 0.647,0),\n                vec3(1    , 0.784,0.196),\n                vec3(1    , 0,1)\n            );\n            \n            vec3 ResidueColors[23] = vec3[](\n                vec3(200,200,200)/255.0,     // ALA      dark grey\n                vec3(20,90,255)/255.0,       // ARG      blue\n                vec3(0,220,220)/255.0,       // ASN      cyan\n                vec3(230,10,10)/255.0,       // ASP      bright red\n                vec3(255,200,50)/255.0,      // CYS      yellow\n                vec3(0,220,220)/255.0,       // GLN      cyan\n                vec3(230,10,10)/255.0,       // GLU      bright red\n                vec3(235,235,235)/255.0,     // GLY      light grey\n                vec3(130,130,210)/255.0,     // HID      pale blue\n                vec3(130,130,210)/255.0,     // HIE      pale blue\n                vec3(130,130,210)/255.0,     // HIP      pale blue\n                vec3(130,130,210)/255.0,     // HIS      pale blue\n                vec3(15,130,15)/255.0,       // ILE      green\n                vec3(15,130,15)/255.0,       // LEU      green\n                vec3(20,90,255)/255.0,       // LYS      blue\n                vec3(255,200,50)/255.0,      // MET      yellow\n                vec3(50,50,170)/255.0,       // PHE      mid blue\n                vec3(220,150,130)/255.0,     // PRO      flesh\n                vec3(250,150,0)/255.0,       // SER      orange\n                vec3(250,150,0)/255.0,       // THR      orange\n                vec3(180,90,180)/255.0,      // TRP      pink\n                vec3(50,50,170)/255.0,       // TYR      mid blue\n                vec3(15,130,15) /255.0       // VAL      green\n            );\n            \n            const float HCV_EPSILON = 1e-10;\n            \n            // hue chroma value\n            vec3 rgb_to_hcv(vec3 rgb)\n            {\n                // Based on work by Sam Hocevar and Emil Persson\n                vec4 P = (rgb.g < rgb.b) ? vec4(rgb.bg, -1.0, 2.0/3.0) : vec4(rgb.gb, 0.0, -1.0/3.0);\n                vec4 Q = (rgb.r < P.x) ? vec4(P.xyw, rgb.r) : vec4(rgb.r, P.yzx);\n                float C = Q.x - min(Q.w, Q.y);\n                float H = abs((Q.w - Q.y) / (6.0 * C + HCV_EPSILON) + Q.z);\n                return vec3(H, C, Q.x);\n            }\n\n            vec3 hue_to_rgb(float H)\n            {\n                float R = abs(H * 6.0 - 3.0) - 1.0;\n                float G = 2.0 - abs(H * 6.0 - 2.0);\n                float B = 2.0 - abs(H * 6.0 - 4.0);\n                return saturate(vec3(R,G,B));\n            }\n\n            // The weights of RGB contributions to luminance.\n  // Should sum to unity.\n  vec3 HCYwts = vec3(0.299, 0.587, 0.114);\n \n  vec3 HCYtoRGB(in vec3 HCY)\n  {\n    vec3 RGB = hue_to_rgb(HCY.x);\n    float Z = dot(RGB, HCYwts);\n    if (HCY.z < Z)\n    {\n        HCY.y *= HCY.z / Z;\n    }\n    else if (Z < 1.0)\n    {\n        HCY.y *= (1.0 - HCY.z) / (1.0 - Z);\n    }\n    return (RGB - Z) * HCY.y + HCY.z;\n  }\n  vec3 RGBtoHCY(in vec3 RGB)\n  {\n    // Corrected by David Schaeffer\n    vec3 HCV = rgb_to_hcv(RGB);\n    float Y = dot(RGB, HCYwts);\n    float Z = dot(hue_to_rgb(HCV.x), HCYwts);\n    if (Y < Z)\n    {\n      HCV.y *= Z / (HCV_EPSILON + Y);\n    }\n    else\n    {\n      HCV.y *= (1.0 - Z) / (HCV_EPSILON + 1.0 - Y);\n    }\n    return vec3(HCV.x, HCV.y, Y);\n  }\n                        \n            float LinearEyeDepth(float z_b)\n            {\n                float z_n = 2.0 * z_b - 1.0;\n                float z_e = 2.0 * zNear * zFar / (zFar + zNear - z_n * (zFar - zNear));\n                return z_e;\n            }\n            \n            void main(void)\n            {\n                vec2 texCoords = vUv;\n                // contains IDs.  index into data buffer.\n                // typeId, instanceId, viewZ\n                vec4 col0 = texture(colorTex, texCoords);\n                if (col0.w < 0.0) {\n                    discard;\n                }\n                float occ1 = texture(ssaoTex1, texCoords).r;\n                float occ2 = texture(ssaoTex2, texCoords).r;\n                int atomId = int(texture(atomIdTex, texCoords).r);\n                //int instanceId = int(texture(instanceIdTex, texCoords).r);\n                int instanceId = int(col0.y);\n            \n                if(instanceId < 0)\n                    discard;\n            \n                vec4 instanceInfo = vec4(0.0,0.0,0.0,0.0);//ProteinInstanceInfo[instanceId];\n                //int ingredientId = int(instanceInfo.x);\n                int ingredientId = int(col0.x);\n\n                //vec4 col = vec4(IngredientColor[ingredientId],1.0);\n                // todo: consider using UINT for optimal % operator, instead of INT\n                //vec4 col = vec4(ResidueColors[ingredientId % 23],1.0);\n                ivec2 ncols = textureSize(colorsBuffer, 0);\n                vec4 col = texelFetch(colorsBuffer, ivec2(ingredientId % ncols.x, 0), 0);\n\n                //float z_b = texture(depthBufferTex, texCoords).r;\n                //float eyeDepth = LinearEyeDepth(z_b);\n                float eyeDepth = -col0.z;\n\n                vec4 atomInfo = vec4(0.0,1.0,0.0,0.0);//AtomInfos[atomId];\n\n                int secondaryStructure = int(atomInfo.x);\n                int atomSymbolId = int(atomInfo.y);\n                int residueSymbolId = int(atomInfo.z);\n                int chainSymbolId = int(atomInfo.w);\n\n                //int numChains = int(IngredientInfo[ingredientId].y);\n                int numChains = 1;\n\n                //predefined colors\n                //atomSymbolId = 2;\n                //vec3 atomColor = AtomColors[atomSymbolId];\n                vec3 atomColor = col.xyz;\n                //atomColor = vec3(1,1,1);\n                vec3 aminoAcidColor = ResidueColors[residueSymbolId]; // currently not used\n\n                //ToDo:\n            \n                //ingredient colors and color ranges\n                //float ingredientLocalIndex = _ProteinIngredientsRandomValues[proteinInstanceInfo.proteinIngredientType].x;\n                //float3 ingredientGroupsColorValues = _IngredientGroupsColorValues[groupId].xyz;\n                //float3 ingredientGroupsColorRanges = _IngredientGroupsColorRanges[groupId].xyz;\n                float ingredientLocalIndex;\n                vec3 ingredientGroupsColorValues;\n                vec3 ingredientGroupsColorRanges;\n            \n                //inital Hue-Chroma-Luminance\n                float h = ingredientGroupsColorValues.x + (ingredientGroupsColorRanges.x) * (ingredientLocalIndex - 0.5f);\n                float c = ingredientGroupsColorValues.y + (ingredientGroupsColorRanges.y) * (ingredientLocalIndex - 0.5f);\n                float l = ingredientGroupsColorValues.z + (ingredientGroupsColorRanges.z) * (ingredientLocalIndex - 0.5f);\n            \n//                vec3 hcl = rgb_to_hcv(col.xyz*255.0);\n//                vec3 hcl = rgb_to_hcv(col.xyz);\n                vec3 hcl = rgb_to_hcv(col.xyz*20.0);\n\n                 h = hcl.r;\n                 c = hcl.g+10.0;\n                 l = hcl.b+10.0;\n            \n//                h = IngredientColorHCL[ingredientId].x;\n//                c = IngredientColorHCL[ingredientId].y;\n//                l = IngredientColorHCL[ingredientId].z;\n            \n            \n                //if(false)\n                if(eyeDepth < chainBeginDistance)\n                {\n                    float cc = max(eyeDepth - atomicBeginDistance, 0.0);\n                    float dd = chainBeginDistance - atomicBeginDistance;\n                    float ddd = (1.0-(cc/dd));\n                    if(atomSymbolId > 0) {\n                        l -= 13.0 * ddd;\n                    }\n                }\n            \n                //if(false)\n                if(eyeDepth < chainBeginDistance && numChains > 1)\n                {\n                    float cc = max(eyeDepth - atomicBeginDistance, 0.0);\n                    float dd = chainBeginDistance - atomicBeginDistance;\n                    float ddd = (1.0-(cc/dd));\n            \n                    float wedge = min(50.0 * float(numChains), 180.0);\n                    // float hueShift = wedge / numChains;\n                    // hueShift *= ddd;\n                    float hueShift = 50.0;\n                    hueShift = numChains >= 3 ? 50.0 : hueShift;\n                    hueShift = numChains >= 4 ? 50.0 : hueShift;\n                    hueShift = numChains >= 5 ? 50.0 : hueShift;\n                    hueShift = numChains >= 6 ? 50.0 : hueShift;\n                    hueShift = numChains >= 7 ? 40.0 : hueShift;\n                    hueShift = numChains >= 8 ? 30.0 : hueShift;\n                    hueShift = numChains >= 9 ? 30.0 : hueShift;\n                    hueShift = numChains >= 10 ? 15.0 : hueShift;\n                    hueShift = numChains >= 11 ? 10.0 : hueShift;\n                    hueShift = numChains >= 12 ? 10.0 : hueShift;\n                    hueShift *= (1.0-(cc/dd));\n            \n                    float hueLength = hueShift * float(numChains - 1);\n                    float hueOffset = hueLength * 0.5;\n            \n                    h -=  hueOffset;\n                    h += (float(chainSymbolId) * hueShift);\n                }\n            \n                // if (somethingIsSelected == 1)\n                // {\n                //   if (instanceInfo.y == 1.0)\n                //   {\n                //     c += 30;\n                //     l += 11;\n                //   }\n                //   else {\n                //     c -= 30;\n                //     l -= 11;\n                //   }\n                // }\n                //~ just tone it down a bright\n                // l -= 11;\n                c -= 15.0;\n            \n                vec3 color;\n                color = d3_hcl_lab(h, c, l);\n                color = max(color, vec3(0.0,0.0,0.0));\n                color = min(color, vec3(1.0,1.0,1.0));\n                \n                //if(false)\n                if(eyeDepth < atomicBeginDistance)\n                {\n                    float t = (eyeDepth/atomicBeginDistance);\n                    t = 1.0 - clamp(t, 0.0, 1.0);\n                    color.xyz = mix(color.xyz, atomColor, t);\n                    //color.xyz = atomColor;\n                    //color.xyz = vec3(0.0, 1.0, 0.0);\n                }\n            \n                if (highlightInstance == col0.y) {\n                    color.xyz = vec3(1.0, 0.0, 0.0);\n                }\n                gl_FragColor = vec4(occ1 * occ2 * color.xyz, 1.0);\n                \n                //                gl_FragColor = vec4(occ1 * occ2 * col0.xyz, 1.0);\n//                gl_FragColor = vec4(occ1 * occ2 * col.xyz, 1.0);\n                //gl_FragColor = vec4(col.xyz, 1.0);\n\n//~ for debug: depth\n//gl_FragColor = vec4((eyeDepth-zNear)/(zFar-zNear), (eyeDepth-zNear)/(zFar-zNear), (eyeDepth-zNear)/(zFar-zNear), 1.0);\n              //out_color = vec4(occ1 * occ2 * col.xyz, 1.0);\n                //out_color = vec4(vec3(residueSymbolId), 1.0);\n                //out_color = vec4(vec3(instanceId), 1.0);\n                //out_color = vec4(vec3(numChains*0.01f,0,0), 1.0);\n            \n                //out_color = vec4(aminoAcidColor, 1.0);\n                //out_color = vec4(vec3(chainSymbolId*0.5), 1.0);\n            }\n            \n            "
    });
  } // colorsData is a Float32Array of rgba


  _createClass(CompositePass, [{
    key: "updateColors",
    value: function updateColors(numColors, colorsData) {
      this.pass.material.uniforms.colorsBuffer.value = new _three.DataTexture(colorsData, numColors, 1, _three.RGBAFormat, _three.FloatType);
    } // eslint-disable-next-line @typescript-eslint/no-unused-vars

  }, {
    key: "resize",
    value: function resize(x, y) {}
  }, {
    key: "render",
    value: function render(renderer, camera, target, ssaoBuffer1, ssaoBuffer2, colorBuffer) {
      this.pass.material.uniforms.zNear.value = camera.near;
      this.pass.material.uniforms.zFar.value = camera.far;
      this.pass.material.uniforms.colorTex.value = colorBuffer.texture;
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

var _default = CompositePass;
exports.default = _default;