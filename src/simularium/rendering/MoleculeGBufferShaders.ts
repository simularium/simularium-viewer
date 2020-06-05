import { Color, FrontSide, Matrix4, ShaderMaterial, Vector2 } from "three";

const vertexShader = `
precision highp float;

attribute float vTypeId;
attribute float vInstanceId;

    uniform vec2 iResolution;
    uniform float Scale;
    varying vec3 IN_viewPos;
    varying float IN_radius;
    flat out int IN_typeId;
    flat out int IN_instanceId;
    // varying vec4 IN_color;
    // flat int IN_atomId;
    uniform float radius;
    void main()	{
        vec3 p = position.xyz;
        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
        IN_viewPos = modelViewPosition.xyz;
        //IN_viewZ = modelViewPosition.z;
        //IN_radius = 20.0;
        // IN_color = vec4(1.0, 0.0, 0.0, 1.0);
        // IN_instanceId = 1;
        // IN_atomId = 1;

        gl_Position = projectionMatrix * modelViewPosition;

        //IN_radius = (gl_Position.w > 0) ? gl_Position.w : 20.0;
        //gl_PointSize = IN_radius;
        //center = (0.5 * gl_Position.xy/gl_Position.w + 0.5) * vpSize;

        gl_PointSize = iResolution.y * projectionMatrix[1][1] * radius * Scale / gl_Position.w;
        //gl_PointSize = 10.0;
        //gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
        IN_radius = radius;
        IN_typeId = int(vTypeId);
        IN_instanceId = int(vInstanceId);
    }
`;

const fragmentShader = `
precision highp float;

varying vec3 IN_viewPos;
varying float IN_radius;
flat in int IN_typeId;
flat in int IN_instanceId;
    // varying vec4 IN_color;
    // flat int IN_instanceId;
    // flat int IN_atomId;

    uniform vec2 iResolution;

    uniform float Scale;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    
    void main()	{
        //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        //return;
        

        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;
        float lensqr = dot(uv, uv);
        if (lensqr > 1.0) discard;

        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));
        normal = normalize(normal);
        vec3 normalOut = normal * 0.5 + 0.5;
        //out_normal = vec4(normalOut, 1.0);

        vec3 fragViewPos = IN_viewPos;
        // adding pushes Z back. so "center" of sphere is "frontmost"
        fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);
        //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao
      
        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
        float n = gl_DepthRange.near;
        float f = gl_DepthRange.far;
        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;
        gl_FragDepth = fragPosDepth;
      
        //out_color = IN_color;
        //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);
        //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);


        //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);
        // gl_FragColor = vec4(gl_PointCoord.xy, 0.0, 1.0);
        
        gl_FragColor = vec4(float(IN_typeId), float(IN_instanceId), fragViewPos.z, fragPosDepth);
        //gl_FragColor = vec4(float(IN_typeId)/50.0, float(IN_typeId)/50.0, float(IN_typeId)/50.0, 1.0);
        //gl_FragColor = vec4(84.0/255.0, 179.0/255.0, 162.0/255.0, 1.0);
    }

`;

const normalShader = `
precision highp float;

varying vec3 IN_viewPos;
varying float IN_radius;
flat in int IN_typeId;
flat in int IN_instanceId;

    // varying vec4 IN_color;
    // flat int IN_instanceId;
    // flat int IN_atomId;

    uniform vec2 iResolution;

    uniform float Scale;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    
    void main()	{
        
        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;
        float lensqr = dot(uv, uv);
        if (lensqr > 1.0) discard;

        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));
        normal = normalize(normal);
        vec3 normalOut = normal * 0.5 + 0.5;
        //out_normal = vec4(normalOut, 1.0);

        vec3 fragViewPos = IN_viewPos;
        // adding pushes Z back. so "center" of sphere is "frontmost"
        fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);
        //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao
      
        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
        float n = gl_DepthRange.near;
        float f = gl_DepthRange.far;
        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;
        gl_FragDepth = fragPosDepth;
      
        //out_color = IN_color;
        //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);
        //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);


        //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);
        gl_FragColor = vec4(normalOut, 1.0);
    }

`;
const positionShader = `
precision highp float;

varying vec3 IN_viewPos;
varying float IN_radius;
flat in int IN_typeId;
flat in int IN_instanceId;

    // varying vec4 IN_color;
    // flat int IN_instanceId;
    // flat int IN_atomId;

    uniform vec2 iResolution;

    uniform float Scale;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    
    void main()	{
        
        vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;
        float lensqr = dot(uv, uv);
        if (lensqr > 1.0) discard;

        vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));
        normal = normalize(normal);
        vec3 normalOut = normal * 0.5 + 0.5;
        //out_normal = vec4(normalOut, 1.0);

        vec3 fragViewPos = IN_viewPos;
        // adding pushes Z back. so "center" of sphere is "frontmost"
        fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);
        //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao
      
        vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
        vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
        float n = gl_DepthRange.near;
        float f = gl_DepthRange.far;
        float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;
        gl_FragDepth = fragPosDepth;
      
        //out_color = IN_color;
        //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);
        //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);


        //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);
        gl_FragColor = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);
    }

`;

const colorMaterial = new ShaderMaterial({
    uniforms: {
        radius: { value: 1.0 },
        color: { value: new Color(0x44ff44) },
        iResolution: { value: new Vector2() },
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
        iResolution: { value: new Vector2() },
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
        iResolution: { value: new Vector2() },
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
