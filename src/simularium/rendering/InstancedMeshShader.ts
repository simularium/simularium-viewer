import { FrontSide, Matrix4, ShaderMaterial } from "three";

import { MultipassShaders } from "./MultipassMaterials";

const vertexShader = `
precision highp float;

#ifdef WRITE_POS
out vec3 IN_viewPos;
#endif
#ifdef WRITE_NORMAL
out vec3 IN_viewNormal;
#endif
#ifdef WRITE_INSTANCE
out vec2 IN_instanceAndTypeId;
#endif

// per instance attributes
in vec4 translateAndScale; // xyz trans, w scale
in vec4 rotation; // quaternion
// instanceID, typeId
in vec2 instanceAndTypeId;

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
    #ifdef WRITE_POS
    IN_viewPos = modelViewPosition.xyz;
    #endif
    #ifdef WRITE_NORMAL
    IN_viewNormal = normalMatrix * normal.xyz;
    #endif
    #ifdef WRITE_INSTANCE
    IN_instanceAndTypeId = instanceAndTypeId.xy;
    #endif
  
    gl_Position = projectionMatrix * modelViewPosition;

}
`;

const fragmentShader = `
precision highp float;

in vec3 IN_viewPos;

in vec2 IN_instanceAndTypeId;

uniform mat4 projectionMatrix;
          
void main() {
    vec3 fragViewPos = IN_viewPos;

    vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
    vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
    float n = gl_DepthRange.near;
    float f = gl_DepthRange.far;
    // TODO: is this the smae as gl_FragCoord.z ???
    float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;

    gl_FragColor = vec4(IN_instanceAndTypeId.y, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);
}
`;

const normalShader = `
precision highp float;

in vec3 IN_viewNormal;

void main() {
    vec3 normal = IN_viewNormal;
    normal = normalize(normal);
    vec3 normalOut = normal * 0.5 + 0.5;
    gl_FragColor = vec4(normalOut, 1.0);
}
`;

const positionShader = `
precision highp float;

in vec3 IN_viewPos;

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
        WRITE_INSTANCE: true,
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
        WRITE_INSTANCE: false,
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
        WRITE_INSTANCE: false,
    },
});

const shaderSet: MultipassShaders = {
    color: colorMaterial,
    position: positionMaterial,
    normal: normalMaterial,
};

export default {
    shaderSet,
};
