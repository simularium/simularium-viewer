import { FrontSide, GLSL3, Matrix4, RawShaderMaterial, Vector2 } from "three";

import { MRTShaders } from "./MultipassMaterials";

const vertexShader = `
precision highp float;

    uniform vec2 iResolution;
    uniform float scale;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    in vec4 position;

    out vec3 IN_viewPos;
    out float IN_radius;
    out vec2 IN_instanceAndTypeId;

    // per instance attributes
    in vec4 translateAndScale; // xyz trans, w scale
    in vec4 rotation; // quaternion
    // instanceID, typeId, lod_scale
    in vec3 instanceAndTypeId; 

    vec3 applyQuaternionToVector( vec4 q, vec3 v ) {
        return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
    }
    
    void main()	{
        vec3 p = position.xyz;
    
        // per-instance transform
        p *= translateAndScale.w;
        p = applyQuaternionToVector(rotation, p);
        p += translateAndScale.xyz;
    
        float radius = instanceAndTypeId.z;

        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
        IN_viewPos = modelViewPosition.xyz;
        IN_instanceAndTypeId = instanceAndTypeId.xy;

        gl_Position = projectionMatrix * modelViewPosition;

        gl_PointSize = iResolution.y * projectionMatrix[1][1] * radius * scale / gl_Position.w;
        IN_radius = radius;
    }
`;

const fragmentShader = `
precision highp float;

in vec3 IN_viewPos;
in float IN_radius;
in vec2 IN_instanceAndTypeId;

layout(location = 0) out vec4 gAgentInfo;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gPos;

    uniform vec2 iResolution;
    
    uniform float scale;
    uniform mat4 projectionMatrix;
    
    void main()	{
        // gl_PointCoord spans (0,0)..(1,1)
        // uv spans (-1,-1)..(1,1)
        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;
        float lensqr = dot(uv, uv);
        if (lensqr > 1.0) discard;

        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));
        normal = normalize(normal);

        vec3 fragViewPos = IN_viewPos;
        // adding pushes Z back. so "center" of sphere is "frontmost"
        fragViewPos.z += IN_radius * scale * sqrt(1.0 - lensqr);
      
        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
        float n = gl_DepthRange.near;
        float f = gl_DepthRange.far;
        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;

        gl_FragDepth = fragPosDepth;

        // uncomment the following line to test LOD.  IN_radius is a measure of lod.
        //gAgentInfo = vec4(IN_radius*4.0, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);

        gAgentInfo = vec4(IN_instanceAndTypeId.y, IN_instanceAndTypeId.x, fragViewPos.z, fragPosDepth);
        
        gNormal = vec4(normal * 0.5 + 0.5, 1.0);
        gPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);
    }

`;

const multiMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    uniforms: {
        iResolution: { value: new Vector2() },
        scale: { value: 1.0 },
        modelViewMatrix: { value: new Matrix4() },
        projectionMatrix: { value: new Matrix4() },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: FrontSide,
    transparent: false,
});

const shaderSet: MRTShaders = {
    mat: multiMaterial,
};

export default {
    shaderSet,
};
