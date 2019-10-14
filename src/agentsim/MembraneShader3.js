// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

import RenderToBuffer from "./RenderToBuffer.js";


class MembraneShader3Sim {
	constructor() {
		this.pass0 = new RenderToBuffer({
			uniforms: {
				iResolution: { value: new THREE.Vector2(2,2) },
				iTime: { value: 0.0 },
				iChannel0: {type:'t', value: null },
				iChannelResolution0: { value: new THREE.Vector2(2,2) }
			},
			fragmentShader: `
			uniform float iTime;
			uniform vec2 iResolution;
			uniform sampler2D iChannel0;
			uniform vec2 iChannelResolution0;
			varying vec2 vUv;
			void main() {
				gl_FragColor = vec4(1.0*sin(iTime), 0.0, 0.0, 1.0);
			}
			`
		});
		
		this.pass1 = new RenderToBuffer({
			uniforms: {
				iResolution: { value: new THREE.Vector2(2,2) },
				iTime: { value: 0.0 },
				iChannel0: {type:'t', value: null },
				iChannelResolution0: { value: new THREE.Vector2(2,2) }
			},
			fragmentShader: `
			uniform float iTime;
			uniform vec2 iResolution;
			uniform sampler2D iChannel0;
			uniform vec2 iChannelResolution0;
			varying vec2 vUv;
			void main() {
				gl_FragColor = vec4(texture2D(iChannel0, vUv).rgb + vec3(0.0, 1.0, 0.0), 1.0);
			}
			`
		});
		
		this.pass2 = new RenderToBuffer({
			uniforms: {
				iResolution: { value: new THREE.Vector2(2,2) },
				iTime: { value: 0.0 },
				iChannel0: {type:'t', value: null },
				iChannelResolution0: { value: new THREE.Vector2(2,2) }
			},
			fragmentShader: `
			uniform float iTime;
			uniform vec2 iResolution;
			uniform sampler2D iChannel0;
			uniform vec2 iChannelResolution0;
			varying vec2 vUv;
			void main() {
				gl_FragColor = vec4(texture2D(iChannel0, vUv).rgb + vec3(0.0, 0.0, 0.5), 1.0);
			}
			`
		});
		
		this.tgt0 = new THREE.WebGLRenderTarget(2, 2, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false,
		});
		this.tgt0.texture.generateMipmaps = false;
		
		this.tgt1 = new THREE.WebGLRenderTarget(2, 2, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false,
		});
		this.tgt1.texture.generateMipmaps = false;
		
		this.tgt2 = new THREE.WebGLRenderTarget(2, 2, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false,
		});
		this.tgt2.texture.generateMipmaps = false;
		
	}

	resize(x,y) {
		this.tgt0.setSize(x,y);
		this.tgt1.setSize(x,y);
		this.tgt2.setSize(x,y);
	
		this.tgt0.clear();
		this.tgt1.clear();
		this.tgt2.clear();
	}
	
	render(renderer, time) {
		this.pass0.material.uniforms.iChannel0.value = this.tgt2.texture;
		this.pass0.material.uniforms.iTime.value = time;
	
		this.pass0.render(renderer, this.tgt0);
	
		this.pass1.material.uniforms.iChannel0.value = this.tgt0.texture;
	
		this.pass1.render(renderer, this.tgt1);
	
		this.pass2.material.uniforms.iChannel0.value = this.tgt1.texture;
	
		this.pass2.render(renderer, this.tgt2);

		// restore original framebuffer canvas
		renderer.setRenderTarget(null);
	}
	
}

const vertexShader = `
    uniform float iTime;
    uniform vec2 iResolution;
    varying vec2 vUv;
    varying vec3 n;
    varying vec3 eye;
    void main()	{
        vec3 p = position.xyz;
        //vec3 p = position.xyz + vec3(sin(iTime*4.0 + position.x)*6.0, cos(iTime*3.0 + position.y)*6.0, sin(iTime*5.0 + position.z)*6.0);
        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
        vUv = uv;
        n = normalMatrix * normal;
        eye = modelViewPosition.xyz;
        gl_Position = projectionMatrix * modelViewPosition;
    }
`;

const fragmentShader = `
    uniform float iTime;
    uniform vec2 iResolution;
    uniform sampler2D iChannel0;

    varying vec2 vUv;
    varying vec3 n;
    varying vec3 eye;

    float time;

	void main()
{
    gl_FragColor = texture2D(iChannel0, vUv); 
}
`;

const MembraneShader = new THREE.ShaderMaterial({
    uniforms: {
        color: { value: new THREE.Color(0x44ff44)},
        iTime: { value: 1.0 },
        iResolution: { value: new THREE.Vector2() },
        iChannel0: {type:'t', value: null },
    },        
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
});

export default { 
	MembraneShader3Sim: MembraneShader3Sim,
	MembraneShader: MembraneShader
};