import { FrontSide, Matrix4, ShaderMaterial } from "three";

const vertexShader = `
precision highp float;

attribute vec4 translateAndScale; // xyz trans, w scale
attribute vec4 rotationQ; // quaternion
attribute vec2 instanceAndTypeId;

varying vec3 IN_viewPos;
varying vec3 IN_viewNormal;
varying vec2 IN_instanceAndTypeId;
          
vec3 applyTRS( vec3 position, vec3 translation, vec4 quaternion, float scale ) {
	position *= scale;
	position += 2.0 * cross( quaternion.xyz, cross( quaternion.xyz, position ) + quaternion.w * position );
	return position + translation;
}

void main()	{
    vec3 p = applyTRS(position.xyz, translateAndScale.xyz, rotationQ, translateAndScale.w);
    //vec3 p = position.xyz*translateAndScale.w + translateAndScale.xyz;
    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    IN_viewPos = modelViewPosition.xyz;
    IN_viewNormal = normalMatrix * normal.xyz;

    gl_Position = projectionMatrix * modelViewPosition;
    IN_instanceAndTypeId = instanceAndTypeId;

}
`;

const fragmentShader = `
precision highp float;

varying vec3 IN_viewPos;
varying vec3 IN_viewNormal;
varying vec2 IN_instanceAndTypeId;

uniform mat4 projectionMatrix;

void main()	{
    vec3 fragViewPos = IN_viewPos;
  
    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
    vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
    float n = gl_DepthRange.near;
    float f = gl_DepthRange.far;
    // TODO: is this the same as gl_FragCoord.z ???
    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;

    // type id, instance id, zEye, zFragDepth
    gl_FragColor = vec4(IN_instanceAndTypeId.x, IN_instanceAndTypeId.y, fragViewPos.z, fragPosDepth);
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

export default {
    positionMaterial,
    normalMaterial,
    colorMaterial,
};
