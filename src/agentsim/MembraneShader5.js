// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

import RenderToBuffer from "./RenderToBuffer.js";

const nMolEdge = 32-4;
// set dataTextureSize > nMolEdge so there is a border for things to bounce.
// TODO if can force equal, then the code can be simplified/optimized.
const dataTextureSize = nMolEdge+4;

class MembraneShaderSim {
	constructor() {
		this.frame = 0;

		this.pass0 = new RenderToBuffer({
			uniforms: {
				iResolution: { value: new THREE.Vector2(dataTextureSize, dataTextureSize) },
				iFrame: { value: 0 },
				iTime: { value: 0.0 },
				iChannel0: { value: null },
				iChannelResolution0: { value: new THREE.Vector2(dataTextureSize, dataTextureSize) }
			},
			fragmentShader: `
			uniform int iFrame;
			uniform float iTime;
			uniform vec2 iResolution;
			uniform sampler2D iChannel0;
			uniform vec2 iChannelResolution0;
			varying vec2 vUv;

			// "Molecular Dynamics" by dr2 - 2016
			// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
			
			#define txBuf iChannel0
			#define txSize iChannelResolution0.xy
			//#define mPtr iMouse
			
			float Hashff (float p)
			{
			  const float cHashM = 43758.54;
			  return fract (sin (p) * cHashM);
			}
			
			const float txRow = ${dataTextureSize}.;
			
			vec4 Loadv4 (int idVar)
			{
			  float fi = float (idVar);
			  return texture2D (txBuf, (vec2 (mod (fi, txRow), floor (fi / txRow)) + 0.5) /
				 txSize);
			}
			
			void Savev4 (int idVar, vec4 val, inout vec4 fCol, vec2 fCoord)
			{
			  float fi = float (idVar);
			  vec2 d = abs (fCoord - vec2 (mod (fi, txRow), floor (fi / txRow)) - 0.5);
			  if (max (d.x, d.y) < 0.5) fCol = val;
			}
			
			const int nMolEdge = ${nMolEdge};
			const int nMol = nMolEdge * nMolEdge;
			float bFac;
			
			vec4 Step (int mId)
			{
			  vec4 p, pp;
			  vec2 dr, f;
			  float rr, rri, rri3, rCut, rrCut, bLen, dt;
			  f = vec2 (0.);
			  p = Loadv4 (mId);
			  rCut = pow (2., 1./6.);
			  rrCut = rCut * rCut;
			  for (int n = 0; n < nMol; n ++) {
				pp = Loadv4 (n);
				dr = p.xy - pp.xy;
				rr = dot (dr, dr);
				if (n != mId && rr < rrCut) {
				  rri = 1. / rr;
				  rri3 = rri * rri * rri;
				  f += 48. * rri3 * (rri3 - 0.5) * rri * dr;
				}
			  }
			  bLen = bFac * float (nMolEdge);
			  dr = 0.5 * (bLen + rCut) - abs (p.xy);
			  if (dr.x < rCut) {
				if (p.x > 0.) dr.x = - dr.x;
				rri = 1. / (dr.x * dr.x);
				rri3 = rri * rri * rri;
				f.x += 48. * rri3 * (rri3 - 0.5) * rri * dr.x;
			  }
			  if (dr.y < rCut) {
				if (p.y > 0.) dr.y = - dr.y;
				rri = 1. / (dr.y * dr.y);
				rri3 = rri * rri * rri;
				f.y += 48. * rri3 * (rri3 - 0.5) * rri * dr.y;
			  }
			  dt = 0.005;
			  p.zw += dt * f;
			  p.xy += dt * p.zw;
			  return p;
			}
			
			vec4 Init (int mId)
			{
			  vec4 p;
			  float x, y, t, vel;
			  const float pi = 3.14159;
			  y = float (mId / nMolEdge);
			  x = float (mId) - float (nMolEdge) * y;
			  t = 0.25 * (2. * mod (y, 2.) - 1.);
			  p.xy = (vec2 (x + t, y) - 0.5 * float (nMolEdge - 1));
			  t = 2. * pi * Hashff (float (mId));
			  vel = 3.;
			  p.zw = vel * vec2 (cos (t), sin (t));
			  return p;
			}
			
			void main ()
			{
			  vec4 stDat, p;
			  int mId;
			  vec2 kv = floor (gl_FragCoord.xy);
			  mId = int (kv.x + txRow * kv.y);
			  if (kv.x >= txRow || mId > nMol) discard;
			  if (iFrame < 5) {
				bFac = 1.1;
				stDat = vec4 (0., bFac, 0., 0.);
				if (mId < nMol) p = Init (mId);
			  } else {
				stDat = Loadv4 (nMol);
				++ stDat.x;
				bFac = stDat.y;
				if (mId < nMol) p = Step (mId);
				//if (mPtr.z > 0. && stDat.x > 50.) {
				//  stDat.x = 0.;
				//  p = Init (mId);
				//}
			  }
			  Savev4 (mId, ((mId < nMol) ? p : stDat), gl_FragColor, gl_FragCoord.xy);
			}
			
			`
		});
		
		this.pass1 = new RenderToBuffer({
			uniforms: {
				iResolution: { value: new THREE.Vector2(dataTextureSize, dataTextureSize) },
				iFrame: { value: 0 },
				iTime: { value: 0.0 },
				iChannel0: { value: null },
				iChannelResolution0: { value: new THREE.Vector2(dataTextureSize, dataTextureSize) }
			},
			fragmentShader: `
			uniform int iFrame;
			uniform float iTime;
			uniform vec2 iResolution;
			uniform sampler2D iChannel0;
			uniform vec2 iChannelResolution0;
			varying vec2 vUv;

			// "Molecular Dynamics" by dr2 - 2016
			// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
			
			#define txBuf iChannel0
			#define txSize iChannelResolution0.xy
			//#define mPtr iMouse
			
			float Hashff (float p)
			{
			  const float cHashM = 43758.54;
			  return fract (sin (p) * cHashM);
			}
			
			const float txRow = ${dataTextureSize}.;
			
			vec4 Loadv4 (int idVar)
			{
			  float fi = float (idVar);
			  return texture2D (txBuf, (vec2 (mod (fi, txRow), floor (fi / txRow)) + 0.5) /
				 txSize);
			}
			
			void Savev4 (int idVar, vec4 val, inout vec4 fCol, vec2 fCoord)
			{
			  float fi = float (idVar);
			  vec2 d = abs (fCoord - vec2 (mod (fi, txRow), floor (fi / txRow)) - 0.5);
			  if (max (d.x, d.y) < 0.5) fCol = val;
			}
			
			const int nMolEdge = ${nMolEdge};
			const int nMol = nMolEdge * nMolEdge;
			float bFac;
			
			vec4 Step (int mId)
			{
			  vec4 p, pp;
			  vec2 dr, f;
			  float rr, rri, rri3, rCut, rrCut, bLen, dt;
			  f = vec2 (0.);
			  p = Loadv4 (mId);
			  rCut = pow (2., 1./6.);
			  rrCut = rCut * rCut;
			  for (int n = 0; n < nMol; n ++) {
				pp = Loadv4 (n);
				dr = p.xy - pp.xy;
				rr = dot (dr, dr);
				if (n != mId && rr < rrCut) {
				  rri = 1. / rr;
				  rri3 = rri * rri * rri;
				  f += 48. * rri3 * (rri3 - 0.5) * rri * dr;
				}
			  }
			  bLen = bFac * float (nMolEdge);
			  dr = 0.5 * (bLen + rCut) - abs (p.xy);
			  if (dr.x < rCut) {
				if (p.x > 0.) dr.x = - dr.x;
				rri = 1. / (dr.x * dr.x);
				rri3 = rri * rri * rri;
				f.x += 48. * rri3 * (rri3 - 0.5) * rri * dr.x;
			  }
			  if (dr.y < rCut) {
				if (p.y > 0.) dr.y = - dr.y;
				rri = 1. / (dr.y * dr.y);
				rri3 = rri * rri * rri;
				f.y += 48. * rri3 * (rri3 - 0.5) * rri * dr.y;
			  }
			  dt = 0.005;
			  p.zw += dt * f;
			  p.xy += dt * p.zw;
			  return p;
			}
			
			vec4 Init (int mId)
			{
			  vec4 p;
			  float x, y, t, vel;
			  const float pi = 3.14159;
			  y = float (mId / nMolEdge);
			  x = float (mId) - float (nMolEdge) * y;
			  t = 0.25 * (2. * mod (y, 2.) - 1.);
			  p.xy = (vec2 (x + t, y) - 0.5 * float (nMolEdge - 1));
			  t = 2. * pi * Hashff (float (mId));
			  vel = 3.;
			  p.zw = vel * vec2 (cos (t), sin (t));
			  return p;
			}
			
			void main ()
			{
			  vec4 stDat, p;
			  int mId;
			  vec2 kv = floor (gl_FragCoord.xy);
			  mId = int (kv.x + txRow * kv.y);
			  if (kv.x >= txRow || mId > nMol) discard;
			  if (iFrame < 5) {
				bFac = 1.1;
				stDat = vec4 (0., bFac, 0., 0.);
				if (mId < nMol) p = Init (mId);
			  } else {
				stDat = Loadv4 (nMol);
				++ stDat.x;
				bFac = stDat.y;
				if (mId < nMol) p = Step (mId);
				//if (mPtr.z > 0. && stDat.x > 50.) {
				//  stDat.x = 0.;
				//  p = Init (mId);
				//}
			  }
			  Savev4 (mId, ((mId < nMol) ? p : stDat), gl_FragColor, gl_FragCoord.xy);
			}
			
			`
		});
		
		this.pass2 = new RenderToBuffer({
			uniforms: {
				iResolution: { value: new THREE.Vector2(dataTextureSize, dataTextureSize) },
				iFrame: { value: 0 },
				iTime: { value: 0.0 },
				iChannel0: { value: null },
				iChannelResolution0: { value: new THREE.Vector2(dataTextureSize, dataTextureSize) }
			},
			fragmentShader: `
			uniform int iFrame;
			uniform float iTime;
			uniform vec2 iResolution;
			uniform sampler2D iChannel0;
			uniform vec2 iChannelResolution0;
			varying vec2 vUv;

			// "Molecular Dynamics" by dr2 - 2016
			// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
			
			#define txBuf iChannel0
			#define txSize iChannelResolution0.xy
			//#define mPtr iMouse
			
			float Hashff (float p)
			{
			  const float cHashM = 43758.54;
			  return fract (sin (p) * cHashM);
			}
			
			const float txRow = ${dataTextureSize}.;
			
			vec4 Loadv4 (int idVar)
			{
			  float fi = float (idVar);
			  return texture2D (txBuf, (vec2 (mod (fi, txRow), floor (fi / txRow)) + 0.5) /
				 txSize);
			}
			
			void Savev4 (int idVar, vec4 val, inout vec4 fCol, vec2 fCoord)
			{
			  float fi = float (idVar);
			  vec2 d = abs (fCoord - vec2 (mod (fi, txRow), floor (fi / txRow)) - 0.5);
			  if (max (d.x, d.y) < 0.5) fCol = val;
			}
			
			const int nMolEdge = ${nMolEdge};
			const int nMol = nMolEdge * nMolEdge;
			float bFac;
			
			vec4 Step (int mId)
			{
			  vec4 p, pp;
			  vec2 dr, f;
			  float rr, rri, rri3, rCut, rrCut, bLen, dt;
			  f = vec2 (0.);
			  p = Loadv4 (mId);
			  rCut = pow (2., 1./6.);
			  rrCut = rCut * rCut;
			  for (int n = 0; n < nMol; n ++) {
				pp = Loadv4 (n);
				dr = p.xy - pp.xy;
				rr = dot (dr, dr);
				if (n != mId && rr < rrCut) {
				  rri = 1. / rr;
				  rri3 = rri * rri * rri;
				  f += 48. * rri3 * (rri3 - 0.5) * rri * dr;
				}
			  }
			  bLen = bFac * float (nMolEdge);
			  dr = 0.5 * (bLen + rCut) - abs (p.xy);
			  if (dr.x < rCut) {
				if (p.x > 0.) dr.x = - dr.x;
				rri = 1. / (dr.x * dr.x);
				rri3 = rri * rri * rri;
				f.x += 48. * rri3 * (rri3 - 0.5) * rri * dr.x;
			  }
			  if (dr.y < rCut) {
				if (p.y > 0.) dr.y = - dr.y;
				rri = 1. / (dr.y * dr.y);
				rri3 = rri * rri * rri;
				f.y += 48. * rri3 * (rri3 - 0.5) * rri * dr.y;
			  }
			  dt = 0.005;
			  p.zw += dt * f;
			  p.xy += dt * p.zw;
			  return p;
			}
			
			vec4 Init (int mId)
			{
			  vec4 p;
			  float x, y, t, vel;
			  const float pi = 3.14159;
			  y = float (mId / nMolEdge);
			  x = float (mId) - float (nMolEdge) * y;
			  t = 0.25 * (2. * mod (y, 2.) - 1.);
			  p.xy = (vec2 (x + t, y) - 0.5 * float (nMolEdge - 1));
			  t = 2. * pi * Hashff (float (mId));
			  vel = 3.;
			  p.zw = vel * vec2 (cos (t), sin (t));
			  return p;
			}
			
			void main()
			{
			  vec4 stDat, p;
			  int mId;
			  vec2 kv = floor (gl_FragCoord.xy);
			  mId = int (kv.x + txRow * kv.y);
			  if (kv.x >= txRow || mId > nMol) discard;
			  if (iFrame < 5) {
				bFac = 1.1;
				stDat = vec4 (0., bFac, 0., 0.);
				if (mId < nMol) p = Init (mId);
			  } else {
				stDat = Loadv4 (nMol);
				++ stDat.x;
				bFac = stDat.y;
				if (mId < nMol) p = Step (mId);
				//if (mPtr.z > 0. && stDat.x > 50.) {
				//  stDat.x = 0.;
				//  p = Init (mId);
				//}
			  }
			  Savev4 (mId, ((mId < nMol) ? p : stDat), gl_FragColor, gl_FragCoord.xy);
			}
			
			`
		});
		
		this.tgt0 = new THREE.WebGLRenderTarget(dataTextureSize, dataTextureSize, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false,
		});
		this.tgt0.texture.generateMipmaps = false;
		
		this.tgt1 = new THREE.WebGLRenderTarget(dataTextureSize, dataTextureSize, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false,
		});
		this.tgt1.texture.generateMipmaps = false;
		
		this.tgt2 = new THREE.WebGLRenderTarget(dataTextureSize, dataTextureSize, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthBuffer: false,
			stencilBuffer: false,
		});
		this.tgt2.texture.generateMipmaps = false;

		// init the texture that will be used by each pass as input.
		this.pass0.material.uniforms.iChannel0.value = this.tgt2.texture;
		this.pass1.material.uniforms.iChannel0.value = this.tgt0.texture;
		this.pass2.material.uniforms.iChannel0.value = this.tgt1.texture;

	}

	resize(x,y) {
		//this.tgt0.setSize(x,y);
		//this.tgt1.setSize(x,y);
		//this.tgt2.setSize(x,y);

		this.pass0.material.uniforms.iResolution.value = new THREE.Vector2(this.tgt0.width, this.tgt0.height);
		this.pass1.material.uniforms.iResolution.value = new THREE.Vector2(this.tgt1.width, this.tgt1.height);
		this.pass2.material.uniforms.iResolution.value = new THREE.Vector2(this.tgt2.width, this.tgt2.height);

		// gets tgt2 size
		this.pass0.material.uniforms.iChannelResolution0.value = new THREE.Vector2(this.tgt2.width, this.tgt2.height);
		// gets tgt0 size
		this.pass1.material.uniforms.iChannelResolution0.value = new THREE.Vector2(this.tgt0.width, this.tgt0.height);
		// gets tgt1 size
		this.pass2.material.uniforms.iChannelResolution0.value = new THREE.Vector2(this.tgt1.width, this.tgt1.height);

		//this.tgt0.clear();
		//this.tgt1.clear();
		//this.tgt2.clear();
	}
	
	render(renderer, time, frame) {
		const old = renderer.autoClear;
		renderer.autoClear = false;

		this.pass0.material.uniforms.iChannel0.value = this.tgt2.texture;
		this.pass0.material.uniforms.iFrame.value = this.frame;
	
		this.pass0.render(renderer, this.tgt0);
	
		this.pass1.material.uniforms.iChannel0.value = this.tgt0.texture;
		this.pass1.material.uniforms.iFrame.value = this.frame;
	
		this.pass1.render(renderer, this.tgt1);
	
		this.pass2.material.uniforms.iChannel0.value = this.tgt1.texture;
		this.pass2.material.uniforms.iFrame.value = this.frame;
	
		this.pass2.render(renderer, this.tgt2);

		// restore original framebuffer canvas
		renderer.setRenderTarget(null);
		renderer.autoClear = old;

		this.frame++;
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
    uniform vec2 iChannelResolution0;
    uniform sampler2D splat;

    varying vec2 vUv;
    varying vec3 n;
    varying vec3 eye;

    float time;

// "Molecular Dynamics" by dr2 - 2016
// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

/*
Simple but inefficient MD program for 2D soft disks. The algorithm
parallelizes but is useless for large systems.

Storing non-pixel data in textures follows iq's approach.

Since the refresh rate is limited to 60 fps, doing multiple compute steps 
between display updates improves performance. Pixel-based rendering of 
large numbers of disks is also time consuming. 

Mouse click restarts run.
*/

#define txBuf iChannel0
#define txSize iChannelResolution0.xy

const float txRow = ${dataTextureSize}.;

vec4 Loadv4 (int idVar)
{
  float fi = float (idVar);
  return texture2D (txBuf, (vec2 (mod (fi, txRow), floor (fi / txRow)) + 0.5) /
     txSize);
}

const int nMolEdge = ${nMolEdge};
const int nMol = nMolEdge * nMolEdge;

#define hue(v)  ( .6 + .6 * cos( 6.3*(v)  + vec3(0,23,21)  ) )  // https://www.shadertoy.com/view/ll2cDc

void main()
{
  vec3 col;
  vec2 uv, ut, q;
  float bFac, dMin, b;
  //uv = 2. * gl_FragCoord.xy / iResolution.xy - 1.;
  //uv.x *= iResolution.x / iResolution.y;
  uv = 2. * vUv - 1.;
  //uv = uv / vec2(${dataTextureSize}.*0.5, ${dataTextureSize}.*0.5);
  //ut = abs (uv) - vec2 (1.);
  //b = max (ut.x, ut.y);
  //ut = abs (ut);
  //if (b > 0.003) col = vec3 (0.82);
  //else if (b < 0. && min (ut.x, ut.y) < 0.01) col = vec3 (0.3, 0.3, 1.);
  //else
   {
    bFac = Loadv4 (nMol).y;
    q = 0.5 * (bFac * float (nMolEdge) + 0.5) * uv;
    dMin = 1000.;
	
	// rendering strategy 1:
	// find distance from fragment location q to nearest particle
	int nn;
	vec2 delta;
	for (int n = 0; n < nMol; n ++) {
		vec2 dd = q - Loadv4 (n).xy;
		float v = length (dd);
		if ( v < dMin ) dMin = v, nn=n, delta=dd;	
	}
	float mixture = 1. - smoothstep (0.4, 0.5, dMin);
	//col = mix (vec3 (0.2),  vec3 (0., 1., 0.), mixture);
//	col = mix (vec3 (0.2),  texture2D(splat, (delta+0.5)).rgb, mixture);
	col = mix (vec3 (0.2),  vec3(delta+0.5, 0.0)*texture2D(splat, (delta+0.5)).rgb, mixture);
//	col = mix (vec3 (0.2),  vec3(delta+0.5, 0.0), mixture);
	

	// rendering strategy 2:
	//int nn;
    //for (int n = 0; n < nMol; n ++) {
	//  float v = length (q - Loadv4 (n).xy);
	//  if ( v < dMin ) dMin = v, nn=n;
    //}
	//col = hue(float(nn)/float(nMol))* smoothstep (0.5, 0.4, dMin);

  }
  gl_FragColor = vec4 (col, 1.);
}

`;

const MembraneShader = new THREE.ShaderMaterial({
    uniforms: {
        color: { value: new THREE.Color(0x44ff44)},
        iTime: { value: 1.0 },
        iResolution: { value: new THREE.Vector2() },
		iChannel0: { value: null },
		iChannelResolution0: { value: new THREE.Vector2(dataTextureSize, dataTextureSize) },
		splat: { value: new THREE.TextureLoader().load("assets/splat.png") },
    },        
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
});

export default { 
	MembraneShaderSim: MembraneShaderSim,
	MembraneShader: MembraneShader
};
