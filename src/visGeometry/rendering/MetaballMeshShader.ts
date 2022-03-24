import {
    FrontSide,
    GLSL3,
    Matrix3,
    Matrix4,
    RawShaderMaterial,
    Vector3,
    Vector4,
} from "three";

import { MRTShaders } from "./MultipassMaterials";

const vertexShader = `
precision highp float;

out vec3 IN_viewPos;
out vec3 IN_viewNormal;
out vec2 IN_instanceAndTypeId;

in vec4 position;
in vec3 normal;

// per instance attributes
uniform vec4 translateAndScale; // xyz trans, w scale
uniform vec4 rotation; // quaternion
// instanceID, typeId
uniform vec3 instanceAndTypeId;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

vec3 applyQuaternionToVector( vec4 q, vec3 v ) {
    return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}

void main() {
    vec3 p = position.xyz;
    
    // per-instance transform
    p *= translateAndScale.w;
    p = applyQuaternionToVector(rotation, p);
    p += translateAndScale.xyz;

    vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
    IN_viewPos = modelViewPosition.xyz;
    IN_viewNormal = normalMatrix * normal.xyz;
    IN_instanceAndTypeId = instanceAndTypeId.xy;
  
    gl_Position = projectionMatrix * modelViewPosition;

}
`;

const fragmentShader = `
precision highp float;

in vec3 IN_viewPos;
in vec3 IN_viewNormal;
in vec2 IN_instanceAndTypeId;

layout(location = 0) out vec4 gAgentInfo;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gPos;

uniform mat4 projectionMatrix;

void main() {
    vec3 fragViewPos = IN_viewPos;

    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
    vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
    float n = gl_DepthRange.near;
    float f = gl_DepthRange.far;
    // TODO: is this the same as gl_FragCoord.z ???
    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;

    gAgentInfo = vec4(IN_instanceAndTypeId.y, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);

    vec3 normal = IN_viewNormal;
    normal = normalize(normal);
    vec3 normalOut = normal * 0.5 + 0.5;
    gNormal = vec4(normalOut, 1.0);

    gPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);

}
`;

const multiMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: FrontSide,
    transparent: false,
    defines: {},
    uniforms: {
        modelViewMatrix: { value: new Matrix4() },
        normalMatrix: { value: new Matrix3() },
        projectionMatrix: { value: new Matrix4() },
        translateAndScale: { value: new Vector4(0, 0, 0, 1) }, // xyz trans, w scale
        rotation: { value: new Vector4(0, 0, 0, 0) }, // quaternion
        // instanceID, typeId
        instanceAndTypeId: { value: new Vector3(0, 0, 0) },
    },
});

const shaderSet: MRTShaders = {
    mat: multiMaterial,
};

export default {
    shaderSet,
};
