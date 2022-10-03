import { FrontSide, Matrix4, ShaderMaterial } from "three";
var vertexShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying vec3 IN_viewNormal;\n          \nvoid main()\t{\n    vec3 p = position.xyz;\n    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n    IN_viewPos = modelViewPosition.xyz;\n    IN_viewNormal = normalMatrix * normal.xyz;\n\n    gl_Position = projectionMatrix * modelViewPosition;\n\n}\n";
var fragmentShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying vec3 IN_viewNormal;\n\nuniform int typeId;\nuniform int instanceId;\n\nuniform mat4 projectionMatrix;\n          \nvoid main()\t{\n    vec3 fragViewPos = IN_viewPos;\n  \n    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n    vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n    float n = gl_DepthRange.near;\n    float f = gl_DepthRange.far;\n    // TODO: is this the smae as gl_FragCoord.z ???\n    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n\n    gl_FragColor = vec4(float(typeId), float(instanceId), fragViewPos.z, fragPosDepth);\n}\n";
var normalShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying vec3 IN_viewNormal;\n\nvoid main()\t{\n    vec3 normal = IN_viewNormal;\n    normal = normalize(normal);\n    vec3 normalOut = normal * 0.5 + 0.5;\n    gl_FragColor = vec4(normalOut, 1.0);\n}\n";
var positionShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\n\nvoid main()\t{\n    \n    vec3 fragViewPos = IN_viewPos;\n    gl_FragColor = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);\n}\n";
var colorMaterial = new ShaderMaterial({
  uniforms: {
    typeId: {
      value: 0
    },
    instanceId: {
      value: 0
    },
    projectionMatrix: {
      value: new Matrix4()
    }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  side: FrontSide,
  transparent: false
});
var normalMaterial = new ShaderMaterial({
  uniforms: {
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