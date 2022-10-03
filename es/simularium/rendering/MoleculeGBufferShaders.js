import { Color, FrontSide, Matrix4, ShaderMaterial, Vector2 } from "three";
var vertexShader = "\nprecision highp float;\n\nattribute float vTypeId;\nattribute float vInstanceId;\n\n    uniform vec2 iResolution;\n    uniform float Scale;\n    varying vec3 IN_viewPos;\n    varying float IN_radius;\n    flat out int IN_typeId;\n    flat out int IN_instanceId;\n    // varying vec4 IN_color;\n    // flat int IN_atomId;\n    uniform float radius;\n    void main()\t{\n        vec3 p = position.xyz;\n        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n        IN_viewPos = modelViewPosition.xyz;\n        //IN_viewZ = modelViewPosition.z;\n        //IN_radius = 20.0;\n        // IN_color = vec4(1.0, 0.0, 0.0, 1.0);\n        // IN_instanceId = 1;\n        // IN_atomId = 1;\n\n        gl_Position = projectionMatrix * modelViewPosition;\n\n        //IN_radius = (gl_Position.w > 0) ? gl_Position.w : 20.0;\n        //gl_PointSize = IN_radius;\n        //center = (0.5 * gl_Position.xy/gl_Position.w + 0.5) * vpSize;\n\n        gl_PointSize = iResolution.y * projectionMatrix[1][1] * radius * Scale / gl_Position.w;\n        //gl_PointSize = 10.0;\n        //gl_Position = vec4(0.0, 0.0, 0.0, 1.0);\n        IN_radius = radius;\n        IN_typeId = int(vTypeId);\n        IN_instanceId = int(vInstanceId);\n    }\n";
var fragmentShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying float IN_radius;\nflat in int IN_typeId;\nflat in int IN_instanceId;\n    // varying vec4 IN_color;\n    // flat int IN_instanceId;\n    // flat int IN_atomId;\n\n    uniform vec2 iResolution;\n\n    uniform float Scale;\n    uniform mat4 modelViewMatrix;\n    uniform mat4 projectionMatrix;\n    \n    void main()\t{\n        //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n        //return;\n        \n\n        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n        float lensqr = dot(uv, uv);\n        if (lensqr > 1.0) discard;\n\n        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n        normal = normalize(normal);\n        vec3 normalOut = normal * 0.5 + 0.5;\n        //out_normal = vec4(normalOut, 1.0);\n\n        vec3 fragViewPos = IN_viewPos;\n        // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n        fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);\n        //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao\n      \n        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n        float n = gl_DepthRange.near;\n        float f = gl_DepthRange.far;\n        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n        gl_FragDepth = fragPosDepth;\n      \n        //out_color = IN_color;\n        //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);\n        //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);\n\n\n        //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);\n        // gl_FragColor = vec4(gl_PointCoord.xy, 0.0, 1.0);\n        \n        gl_FragColor = vec4(float(IN_typeId), float(IN_instanceId), fragViewPos.z, fragPosDepth);\n        //gl_FragColor = vec4(float(IN_typeId)/50.0, float(IN_typeId)/50.0, float(IN_typeId)/50.0, 1.0);\n        //gl_FragColor = vec4(84.0/255.0, 179.0/255.0, 162.0/255.0, 1.0);\n    }\n\n";
var normalShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying float IN_radius;\nflat in int IN_typeId;\nflat in int IN_instanceId;\n\n    // varying vec4 IN_color;\n    // flat int IN_instanceId;\n    // flat int IN_atomId;\n\n    uniform vec2 iResolution;\n\n    uniform float Scale;\n    uniform mat4 modelViewMatrix;\n    uniform mat4 projectionMatrix;\n    \n    void main()\t{\n        \n        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n        float lensqr = dot(uv, uv);\n        if (lensqr > 1.0) discard;\n\n        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n        normal = normalize(normal);\n        vec3 normalOut = normal * 0.5 + 0.5;\n        //out_normal = vec4(normalOut, 1.0);\n\n        vec3 fragViewPos = IN_viewPos;\n        // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n        fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);\n        //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao\n      \n        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n        float n = gl_DepthRange.near;\n        float f = gl_DepthRange.far;\n        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n        gl_FragDepth = fragPosDepth;\n      \n        //out_color = IN_color;\n        //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);\n        //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);\n\n\n        //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);\n        gl_FragColor = vec4(normalOut, 1.0);\n    }\n\n";
var positionShader = "\nprecision highp float;\n\nvarying vec3 IN_viewPos;\nvarying float IN_radius;\nflat in int IN_typeId;\nflat in int IN_instanceId;\n\n    // varying vec4 IN_color;\n    // flat int IN_instanceId;\n    // flat int IN_atomId;\n\n    uniform vec2 iResolution;\n\n    uniform float Scale;\n    uniform mat4 modelViewMatrix;\n    uniform mat4 projectionMatrix;\n    \n    void main()\t{\n        \n        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n        float lensqr = dot(uv, uv);\n        if (lensqr > 1.0) discard;\n\n        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n        normal = normalize(normal);\n        vec3 normalOut = normal * 0.5 + 0.5;\n        //out_normal = vec4(normalOut, 1.0);\n\n        vec3 fragViewPos = IN_viewPos;\n        // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n        fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);\n        //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao\n      \n        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n        float n = gl_DepthRange.near;\n        float f = gl_DepthRange.far;\n        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n        gl_FragDepth = fragPosDepth;\n      \n        //out_color = IN_color;\n        //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);\n        //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);\n\n\n        //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);\n        gl_FragColor = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);\n    }\n\n";
var colorMaterial = new ShaderMaterial({
  uniforms: {
    radius: {
      value: 1.0
    },
    color: {
      value: new Color(0x44ff44)
    },
    iResolution: {
      value: new Vector2()
    },
    Scale: {
      value: 1.0
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
    radius: {
      value: 1.0
    },
    color: {
      value: new Color(0x44ff44)
    },
    iResolution: {
      value: new Vector2()
    },
    Scale: {
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
    color: {
      value: new Color(0x44ff44)
    },
    iResolution: {
      value: new Vector2()
    },
    Scale: {
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