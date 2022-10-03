import { FrontSide, Matrix4, ShaderMaterial, Vector2 } from "three";
var vertexShader = "\nprecision highp float;\n\n    uniform vec2 iResolution;\n    uniform float scale;\n    varying vec3 IN_viewPos;\n    varying float IN_radius;\n\n    uniform float radius;\n    void main()\t{\n        vec3 p = position.xyz;\n        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n        IN_viewPos = modelViewPosition.xyz;\n\n        gl_Position = projectionMatrix * modelViewPosition;\n\n        gl_PointSize = iResolution.y * projectionMatrix[1][1] * radius * scale / gl_Position.w;\n        IN_radius = radius;\n    }\n";
var fragmentShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying float IN_radius;\n\n    uniform vec2 iResolution;\n    uniform float typeId;\n    uniform float instanceId;\n    \n    uniform float scale;\n    uniform mat4 modelViewMatrix;\n    uniform mat4 projectionMatrix;\n    \n    void main()\t{\n        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n        float lensqr = dot(uv, uv);\n        if (lensqr > 1.0) discard;\n\n        vec3 fragViewPos = IN_viewPos;\n        // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n        fragViewPos.z += IN_radius * scale * sqrt(1.0 - lensqr);\n      \n        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n        float n = gl_DepthRange.near;\n        float f = gl_DepthRange.far;\n        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n\n        gl_FragDepth = fragPosDepth;\n      \n        gl_FragColor = vec4(typeId, instanceId, fragViewPos.z, fragPosDepth);\n    }\n\n";
var normalShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying float IN_radius;\n\n    uniform vec2 iResolution;\n\n    uniform float scale;\n    uniform mat4 modelViewMatrix;\n    uniform mat4 projectionMatrix;\n    \n    void main()\t{\n        \n        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n        float lensqr = dot(uv, uv);\n        if (lensqr > 1.0) discard;\n\n        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n        normal = normalize(normal);\n        vec3 normalOut = normal * 0.5 + 0.5;\n\n        vec3 fragViewPos = IN_viewPos;\n        // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n        fragViewPos.z += IN_radius * scale * sqrt(1.0 - lensqr);\n      \n        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n        float n = gl_DepthRange.near;\n        float f = gl_DepthRange.far;\n        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n\n        gl_FragDepth = fragPosDepth;\n\n        gl_FragColor = vec4(normalOut, 1.0);\n    }\n\n";
var positionShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying float IN_radius;\n\n    uniform vec2 iResolution;\n\n    uniform float scale;\n    uniform mat4 modelViewMatrix;\n    uniform mat4 projectionMatrix;\n    \n    void main()\t{\n        \n        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n        float lensqr = dot(uv, uv);\n        if (lensqr > 1.0) discard;\n\n        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n        normal = normalize(normal);\n\n        vec3 fragViewPos = IN_viewPos;\n        // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n        fragViewPos.z += IN_radius * scale * sqrt(1.0 - lensqr);\n      \n        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n        float n = gl_DepthRange.near;\n        float f = gl_DepthRange.far;\n        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n\n        gl_FragDepth = fragPosDepth;\n      \n        gl_FragColor = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);\n    }\n\n";
var colorMaterial = new ShaderMaterial({
  uniforms: {
    radius: {
      value: 1.0
    },
    iResolution: {
      value: new Vector2()
    },
    scale: {
      value: 1.0
    },
    projectionMatrix: {
      value: new Matrix4()
    },
    typeId: {
      value: 0
    },
    instanceId: {
      value: 0
    }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  side: FrontSide,
  transparent: false
});
var normalMaterial = new ShaderMaterial({
  uniforms: {
    radius: {
      value: 1.0
    },
    iResolution: {
      value: new Vector2()
    },
    scale: {
      value: 1.0
    },
    projectionMatrix: {
      value: new Matrix4()
    }
  },
  vertexShader: vertexShader,
  fragmentShader: normalShader,
  side: FrontSide,
  transparent: false
});
var positionMaterial = new ShaderMaterial({
  uniforms: {
    radius: {
      value: 1.0
    },
    iResolution: {
      value: new Vector2()
    },
    scale: {
      value: 1.0
    },
    projectionMatrix: {
      value: new Matrix4()
    }
  },
  vertexShader: vertexShader,
  fragmentShader: positionShader,
  side: FrontSide,
  transparent: false
});
export default {
  positionMaterial: positionMaterial,
  normalMaterial: normalMaterial,
  colorMaterial: colorMaterial
};