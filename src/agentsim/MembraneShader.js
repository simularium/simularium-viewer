// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

const vertexShader = `
    uniform float iTime;
    uniform vec2 iResolution;
    varying vec2 vUv;
    void main()	{
        vec3 p = position.xyz + vec3(sin(iTime*4.0 + position.x)*6.0, cos(iTime*3.0 + position.y)*6.0, sin(iTime*5.0 + position.z)*6.0);
        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewPosition;
    }
`;

const fragmentShader = `
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec3 color;
    varying vec2 vUv;
    void main()	{
        float x = 1.0;//1.0 + sin(iTime*4.0 + 20.0*vUv.x);
        float y = 1.0;//1.0 + sin(iTime*3.0 + 21.0*vUv.y);
        float z = 1.0;//1.0 + sin(iTime*7.0 + 19.0*vUv.y*vUv.x);
        gl_FragColor = vec4(color.rgb * vec3(x,y,z), 0.4);
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
    transparent: true,
});

export default { 
	MembraneShaderSim: null,
	MembraneShader: material
};

