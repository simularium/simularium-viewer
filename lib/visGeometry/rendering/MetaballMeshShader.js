"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _three = require("three");

var vertexShader = "\nprecision highp float;\n\nout vec3 IN_viewPos;\nout vec3 IN_viewNormal;\nout vec2 IN_instanceAndTypeId;\n\nin vec4 position;\nin vec3 normal;\n\n// per instance attributes\nuniform vec4 translateAndScale; // xyz trans, w scale\nuniform vec4 rotation; // quaternion\n// instanceID, typeId\nuniform vec3 instanceAndTypeId;\n\nuniform mat4 modelViewMatrix;\nuniform mat4 projectionMatrix;\nuniform mat3 normalMatrix;\n\nvec3 applyQuaternionToVector( vec4 q, vec3 v ) {\n    return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );\n}\n\nvoid main() {\n    vec3 p = position.xyz;\n    \n    // per-instance transform\n    p *= translateAndScale.w;\n    p = applyQuaternionToVector(rotation, p);\n    p += translateAndScale.xyz;\n\n    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n    IN_viewPos = modelViewPosition.xyz;\n    IN_viewNormal = normalMatrix * normal.xyz;\n    IN_instanceAndTypeId = instanceAndTypeId.xy;\n  \n    gl_Position = projectionMatrix * modelViewPosition;\n\n}\n";
var fragmentShader = "\nprecision highp float;\n\nin vec3 IN_viewPos;\nin vec3 IN_viewNormal;\nin vec2 IN_instanceAndTypeId;\n\nlayout(location = 0) out vec4 gAgentInfo;\nlayout(location = 1) out vec4 gNormal;\nlayout(location = 2) out vec4 gPos;\n\nuniform mat4 projectionMatrix;\n\nvoid main() {\n    vec3 fragViewPos = IN_viewPos;\n\n    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n    vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n    float n = gl_DepthRange.near;\n    float f = gl_DepthRange.far;\n    // TODO: is this the same as gl_FragCoord.z ???\n    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n\n    gAgentInfo = vec4(IN_instanceAndTypeId.y, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);\n\n    vec3 normal = IN_viewNormal;\n    normal = normalize(normal);\n    vec3 normalOut = normal * 0.5 + 0.5;\n    gNormal = vec4(normalOut, 1.0);\n\n    gPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);\n\n}\n";
var multiMaterial = new _three.RawShaderMaterial({
  glslVersion: _three.GLSL3,
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  side: _three.FrontSide,
  transparent: false,
  defines: {},
  uniforms: {
    modelViewMatrix: {
      value: new _three.Matrix4()
    },
    normalMatrix: {
      value: new _three.Matrix3()
    },
    projectionMatrix: {
      value: new _three.Matrix4()
    },
    translateAndScale: {
      value: new _three.Vector4(0, 0, 0, 1)
    },
    // xyz trans, w scale
    rotation: {
      value: new _three.Vector4(0, 0, 0, 0)
    },
    // quaternion
    // instanceID, typeId
    instanceAndTypeId: {
      value: new _three.Vector3(0, 0, 0)
    }
  }
});
var shaderSet = {
  mat: multiMaterial
};
var _default = {
  shaderSet: shaderSet
};
exports["default"] = _default;