import { FrontSide, Matrix4, ShaderMaterial } from "three";
var vertexShader = "\nprecision highp float;\n\nattribute vec4 translateAndScale; // xyz trans, w scale\nattribute vec4 rotationQ; // quaternion\nattribute vec2 instanceAndTypeId;\n\nvarying vec3 IN_viewPos;\nvarying vec3 IN_viewNormal;\nvarying vec2 IN_instanceAndTypeId;\n          \nvec3 applyTRS( vec3 position, vec3 translation, vec4 quaternion, float scale ) {\n\tposition *= scale;\n\tposition += 2.0 * cross( quaternion.xyz, cross( quaternion.xyz, position ) + quaternion.w * position );\n\treturn position + translation;\n}\n\nvoid main()\t{\n    vec3 p = applyTRS(position.xyz, translateAndScale.xyz, rotationQ, translateAndScale.w);\n    //vec3 p = position.xyz*translateAndScale.w + translateAndScale.xyz;\n    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n    IN_viewPos = modelViewPosition.xyz;\n    IN_viewNormal = normalMatrix * normal.xyz;\n\n    gl_Position = projectionMatrix * modelViewPosition;\n    IN_instanceAndTypeId = instanceAndTypeId;\n\n}\n";
var fragmentShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying vec3 IN_viewNormal;\nvarying vec2 IN_instanceAndTypeId;\n\nuniform mat4 projectionMatrix;\n\nvoid main()\t{\n    vec3 fragViewPos = IN_viewPos;\n  \n    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n    vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n    float n = gl_DepthRange.near;\n    float f = gl_DepthRange.far;\n    // TODO: is this the same as gl_FragCoord.z ???\n    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n\n    // type id, instance id, zEye, zFragDepth\n    gl_FragColor = vec4(IN_instanceAndTypeId.y, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);\n}\n";
var normalShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying vec3 IN_viewNormal;\n\nvoid main()\t{\n    vec3 normal = IN_viewNormal;\n    normal = normalize(normal);\n    vec3 normalOut = normal * 0.5 + 0.5;\n    gl_FragColor = vec4(normalOut, 1.0);\n}\n";
var positionShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\n\nvoid main()\t{\n    \n    vec3 fragViewPos = IN_viewPos;\n    gl_FragColor = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);\n}\n";
var colorMaterial = new ShaderMaterial({
  uniforms: {
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