import { FrontSide, Matrix4, ShaderMaterial } from "three";

const vertexShader = `
precision highp float;

#ifdef WRITE_POS
varying vec3 IN_viewPos;
#endif
#ifdef WRITE_NORMAL
varying vec3 IN_viewNormal;
#endif

void main() {
    vec3 p = position.xyz;
    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    #ifdef WRITE_POS
    IN_viewPos = modelViewPosition.xyz;
    #endif
    #ifdef WRITE_NORMAL
    IN_viewNormal = normalMatrix * normal.xyz;
    #endif

    gl_Position = projectionMatrix * modelViewPosition;

}
`;

const fragmentShader = `
precision highp float;

varying vec3 IN_viewPos;

uniform int typeId;
uniform int instanceId;

uniform mat4 projectionMatrix;
          
void main() {
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

varying vec3 IN_viewNormal;

void main() {
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
    defines: {
        WRITE_POS: true,
        WRITE_NORMAL: false,
    },
});
const normalMaterial = new ShaderMaterial({
    uniforms: {
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: normalShader,
    side: FrontSide,
    transparent: false,
    defines: {
        WRITE_POS: false,
        WRITE_NORMAL: true,
    },
});
const positionMaterial = new ShaderMaterial({
    uniforms: {
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: positionShader,
    side: FrontSide,
    transparent: false,
    defines: {
        WRITE_POS: true,
        WRITE_NORMAL: false,
    },
});

export default {
    positionMaterial,
    normalMaterial,
    colorMaterial,
};
