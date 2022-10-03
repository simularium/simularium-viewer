"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _three = require("three");

var vertexShader = "\nprecision highp float;\n\n    uniform vec2 iResolution;\n    uniform float scale;\n    uniform mat4 modelViewMatrix;\n    uniform mat4 projectionMatrix;\n\n    in vec4 position;\n\n    out vec3 IN_viewPos;\n    out float IN_radius;\n    out vec2 IN_instanceAndTypeId;\n\n    // per instance attributes\n    in vec4 translateAndScale; // xyz trans, w scale\n    in vec4 rotation; // quaternion\n    // instanceID, typeId, lod_scale\n    in vec3 instanceAndTypeId; \n\n    vec3 applyQuaternionToVector( vec4 q, vec3 v ) {\n        return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );\n    }\n    \n    void main()\t{\n        vec3 p = position.xyz;\n    \n        // per-instance transform\n        p *= translateAndScale.w;\n        p = applyQuaternionToVector(rotation, p);\n        p += translateAndScale.xyz;\n    \n        float radius = instanceAndTypeId.z;\n\n        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n        IN_viewPos = modelViewPosition.xyz;\n        IN_instanceAndTypeId = instanceAndTypeId.xy;\n\n        gl_Position = projectionMatrix * modelViewPosition;\n\n        gl_PointSize = iResolution.y * projectionMatrix[1][1] * radius * scale / gl_Position.w;\n        IN_radius = radius;\n    }\n";
var fragmentShader = "\nprecision highp float;\n\nin vec3 IN_viewPos;\nin float IN_radius;\nin vec2 IN_instanceAndTypeId;\n\nlayout(location = 0) out vec4 gAgentInfo;\nlayout(location = 1) out vec4 gNormal;\nlayout(location = 2) out vec4 gPos;\n\n    uniform vec2 iResolution;\n    \n    uniform float scale;\n    uniform mat4 projectionMatrix;\n    \n    void main()\t{\n        // gl_PointCoord spans (0,0)..(1,1)\n        // uv spans (-1,-1)..(1,1)\n        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n        float lensqr = dot(uv, uv);\n        if (lensqr > 1.0) discard;\n\n        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n        normal = normalize(normal);\n\n        vec3 fragViewPos = IN_viewPos;\n        // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n        fragViewPos.z += IN_radius * scale * sqrt(1.0 - lensqr);\n      \n        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n        float n = gl_DepthRange.near;\n        float f = gl_DepthRange.far;\n        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n\n        gl_FragDepth = fragPosDepth;\n\n        // uncomment the following line to test LOD.  IN_radius is a measure of lod.\n        //gAgentInfo = vec4(IN_radius*4.0, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);\n        gAgentInfo = vec4(IN_instanceAndTypeId.y, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);\n        gNormal = vec4(normal * 0.5 + 0.5, 1.0);\n        gPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);\n    }\n\n";
var multiMaterial = new _three.RawShaderMaterial({
  glslVersion: _three.GLSL3,
  uniforms: {
    iResolution: {
      value: new _three.Vector2()
    },
    scale: {
      value: 1.0
    },
    modelViewMatrix: {
      value: new _three.Matrix4()
    },
    projectionMatrix: {
      value: new _three.Matrix4()
    }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  side: _three.FrontSide,
  transparent: false
});
var shaderSet = {
  mat: multiMaterial
};
var _default = {
  shaderSet: shaderSet
};
exports["default"] = _default;