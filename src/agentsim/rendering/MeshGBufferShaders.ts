import { Color, FrontSide, Matrix4, ShaderMaterial, Vector2 } from "three";

const vertexShader = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float Scale;

varying vec3 IN_viewPos;
varying float IN_radius;
          
void main()	{
    vec3 p = position.xyz;
    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    IN_viewPos = modelViewPosition.xyz;

    gl_Position = projectionMatrix * modelViewPosition;

}
`;

const fragmentShader = `
precision highp float;

varying vec3 IN_viewPos;
varying vec3 IN_viewNormal;

uniform int IN_typeId;
uniform int IN_instanceId;

uniform mat4 projectionMatrix;
          
void main()	{
    vec3 fragViewPos = IN_viewPos;
  
    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
    float n = gl_DepthRange.near;
    float f = gl_DepthRange.far;
    // TODO: is this the smae as gl_FragCoord.z ???
    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;

    gl_FragColor = vec4(float(IN_typeId), float(IN_instanceId), fragViewPos.z, fragPosDepth);
}
`;

const normalShader = `
precision highp float;

varying vec3 IN_viewPos;
varying vec3 IN_viewNormal;

void main()	{
    vec3 normal = IN_viewNormal;
    normal = normalize(normal);
    vec3 normalOut = normal * 0.5 + 0.5;
    gl_FragColor = vec4(normalOut, 1.0);
}
`;

const positionShader = `
precision highp float;

varying vec3 IN_viewPos;

void main()	{
    
    vec3 fragViewPos = IN_viewPos;
    gl_FragColor = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);
}
`;

const colorMaterial = new ShaderMaterial({
    uniforms: {
        radius: { value: 1.0 },
        color: { value: new Color(0x44ff44) },
        iTime: { value: 1.0 },
        iResolution: { value: new Vector2() },
        iChannel0: { value: null },
        iChannelResolution0: { value: new Vector2(2, 2) },
        Scale: { value: 1.0 },
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: FrontSide,
    transparent: false,
});
const normalMaterial = new ShaderMaterial({
    uniforms: {
        radius: { value: 1.0 },
        color: { value: new Color(0x44ff44) },
        iTime: { value: 1.0 },
        iResolution: { value: new Vector2() },
        iChannel0: { value: null },
        iChannelResolution0: { value: new Vector2(2, 2) },
        Scale: { value: 1.0 },
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: normalShader,
    side: FrontSide,
    transparent: false,
});
const positionMaterial = new ShaderMaterial({
    uniforms: {
        radius: { value: 1.0 },
        color: { value: new Color(0x44ff44) },
        iTime: { value: 1.0 },
        iResolution: { value: new Vector2() },
        iChannel0: { value: null },
        iChannelResolution0: { value: new Vector2(2, 2) },
        Scale: { value: 1.0 },
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: positionShader,
    side: FrontSide,
    transparent: false,
});

export default {
    positionMaterial,
    normalMaterial,
    colorMaterial,
};
