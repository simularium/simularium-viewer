import { FrontSide, Matrix4, ShaderMaterial } from "three";

import { MultipassShaders } from "./MultipassMaterials";

const vertexShader = `
precision highp float;

varying vec3 IN_viewPos;
varying vec3 IN_viewNormal;
          
void main()	{
    vec3 p = position.xyz;
    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    IN_viewPos = modelViewPosition.xyz;
    IN_viewNormal = normalMatrix * normal.xyz;

    gl_Position = projectionMatrix * modelViewPosition;

}
`;

const fragmentShader = `
precision highp float;

varying vec3 IN_viewPos;
varying vec3 IN_viewNormal;

uniform int typeId;
uniform int instanceId;

uniform mat4 projectionMatrix;
          
void main()	{
    vec3 fragViewPos = IN_viewPos;
  
    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
    vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
    float n = gl_DepthRange.near;
    float f = gl_DepthRange.far;
    // TODO: is this the smae as gl_FragCoord.z ???
    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;

    gl_FragColor = vec4(float(typeId), float(instanceId), fragViewPos.z, fragPosDepth);
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
        typeId: { value: 0 },
        instanceId: { value: 0 },
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: FrontSide,
    transparent: false,
});
const normalMaterial = new ShaderMaterial({
    uniforms: {
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: normalShader,
    side: FrontSide,
    transparent: false,
});
const positionMaterial = new ShaderMaterial({
    uniforms: {
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: positionShader,
    side: FrontSide,
    transparent: false,
});

const shaderSet: MultipassShaders = {
    color: colorMaterial,
    position: positionMaterial,
    normal: normalMaterial,
};

export default {
    shaderSet,
};
