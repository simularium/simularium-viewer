import { FrontSide, GLSL3, Matrix3, Matrix4, RawShaderMaterial } from "three";

import { MRTShaders } from "./MultipassMaterials";

const vertexShader = `
precision highp float;

out vec3 IN_viewPos;
out vec3 IN_viewNormal;
out vec2 IN_instanceAndTypeId;

in vec4 position;
in vec3 normal;

// per instance attributes
in vec4 translateAndScale; // xyz trans, w scale
in vec4 rotation; // quaternion
// instanceID, typeId
in vec3 instanceAndTypeId;

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
    gNormal = vec4(normal * 0.5 + 0.5, 1.0);

    gPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);

}
`;

const transparentFragmentShader = `
precision highp float;

in vec3 IN_viewPos;
in vec3 IN_viewNormal;
in vec2 IN_instanceAndTypeId;

layout(location = 0) out vec4 gOutputColor;

uniform mat4 projectionMatrix;
uniform sampler2D colorsBuffer;

void main() {
    int agentColorIndex = int(round(abs(IN_instanceAndTypeId.x))-1.0);
    ivec2 ncols = textureSize(colorsBuffer, 0);
    vec4 col = texelFetch(colorsBuffer, ivec2(agentColorIndex % ncols.x, 0), 0);
    gOutputColor = vec4(texelFetch(colorsBuffer, ivec2(0, 0), 0).xyz, 0.5);
}
`;

function makeMultiMaterial(fragmentShader: string, transparent: boolean) {
    return new RawShaderMaterial({
        glslVersion: GLSL3,
        defines: {},
        uniforms: {
            modelViewMatrix: { value: new Matrix4() },
            normalMatrix: { value: new Matrix3() },
            projectionMatrix: { value: new Matrix4() },
            colorsBuffer: { value: null },
        },
        side: FrontSide,
        vertexShader,
        fragmentShader,
        transparent,
    });
}

const multiMaterial = makeMultiMaterial(fragmentShader, false);
const transMultiMaterial = makeMultiMaterial(transparentFragmentShader, true);

const shaderSet: MRTShaders = {
    mat: multiMaterial,
    transMat: transMultiMaterial,
};

export default {
    shaderSet,
};
