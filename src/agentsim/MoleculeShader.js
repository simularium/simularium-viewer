// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

import RenderToBuffer from "./RenderToBuffer.js";

// strategy:
// 0. based on depth, aggregate atoms in the molecule into larger spheres using clustering ?
// 1. write spheres as GL_POINTs with appropriately scaled size
// 2. fragment shader: discard pts outside of sphere, 
//    write normal
//    write depth
//    write color
//    write instance id (for same molecule...)
// 3. AO shader + blend over color buffer
// 4. outline shader over color buffer
// 

// buffer of points to be drawn as sprites
class MoleculeBuffer {

    constructor(positions) {
        this.geometry = new THREE.BufferGeometry();
        var vertices = [];

        for ( var i = 0; i < 10000; i ++ ) {
            var x = Math.random() * 2000 - 1000;
            var y = Math.random() * 2000 - 1000;
            var z = Math.random() * 2000 - 1000;
            vertices.push( x, y, z );
        }
        this.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

        const vertexShader = `
            uniform float iTime;
            uniform vec2 iResolution;
            void main()	{
                vec3 p = position.xyz;
                vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
                gl_PointSize = 20.0;
                gl_Position = projectionMatrix * modelViewPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec3 IN_viewPos;
            varying float IN_radius;
            varying vec4 IN_color;
            varying flat int IN_instanceId;
            varying flat int IN_atomId;

            uniform float iTime;
            uniform vec2 iResolution;

            uniform float Scale;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            void main()	{
                vec2 uv = gl_PointCoord - vec2(.5, .5);
                float lensqr = dot(uv, uv);
                if (lensqr > 1.0) discard;

                vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));
                normal = normalize(normal);
                vec3 normalOut = normal * 0.5 + 0.5;
                out_normal = vec4(normalOut, 1.0);
  
                vec3 fragViewPos = IN_viewPos;
                fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);
                out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao
              
                vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
                vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
                float n = gl_DepthRange.near;
                float f = gl_DepthRange.far;
                float fragPosDepth = ((f - n) * fragPosNDC.z / 2.0) + ((f + n) / 2.0);
                gl_FragDepth = fragPosDepth;
              
                out_color = IN_color;
                out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);
                out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);
  

                gl_FragColor = vec4(gl_PointCoord.xy, 0.0, 1.0);
            }




            #version 430

            in GSOUTPUT
            {
              vec2 uv;
              vec3 viewPos;
              float radius;
              vec4 color;
              flat int instanceId;
              flat int atomId;
            } INPUT;
            
            uniform float Scale;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            
            layout(location = 0) out vec4 out_color;
            layout(location = 1) out vec4 out_normal;
            layout(location = 2) out vec4 out_viewPos;
            layout(location = 3) out vec4 out_instanceId;
            layout(location = 4) out vec4 out_atomId;
            
            void main(void)
            {
              float lensqr = dot(INPUT.uv, INPUT.uv);
              if (lensqr > 1.0) discard;
            
              vec3 normal = vec3(INPUT.uv.x, INPUT.uv.y, sqrt(1.0 - lensqr));
              normal = normalize(normal);
              vec3 normalOut = normal * 0.5 + 0.5;
              out_normal = vec4(normalOut, 1.0);
            
              //gl_FragDepth = 0.5; // to demostrate z-fighting
            
              vec3 fragViewPos = INPUT.viewPos;
              fragViewPos.z += INPUT.radius * Scale * sqrt(1.0 - lensqr);
              out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao
            
              vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);
              vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;
              float n = gl_DepthRange.near;
              float f = gl_DepthRange.far;
              float fragPosDepth = ((f - n) * fragPosNDC.z / 2.0) + ((f + n) / 2.0);
              gl_FragDepth = fragPosDepth;
            
              out_color = INPUT.color;
              out_instanceId = vec4(float(INPUT.instanceId), 0, 0, 1.0);
              out_atomId = vec4(float(INPUT.atomId), 0, 0, 1.0);
            
            }
            


        `;
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x44ff44)},
                iTime: { value: 1.0 },
                iResolution: { value: new THREE.Vector2() },
                iChannel0: { value: null },
                iChannelResolution0: { value: new THREE.Vector2(2, 2) },
                splat: { value: new THREE.TextureLoader().load("assets/splat.png") },
            },        
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.FrontSide,
            transparent: false,
        });
    
        // could break up into a few particles buffers at the cost of separate draw calls...
        this.particles = new THREE.Points( this.geometry, material );
        this.particles.visible = false;
        //scene.add( this.particles );
    }

    update(positions) {
        // update positions, and reset geoemtry int the particles object.
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
}

export default { 
	MembraneShaderSim: null,
    MembraneShader: null,
    MoleculeBuffer: MoleculeBuffer
};
