// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

import RenderToBuffer from "./RenderToBuffer.js";
import { throwStatement } from '@babel/types';

const dataTextureSize = 32;

const common = `
// play values:
#define GridX 800.          // any value between 20 to 300 is fine
#define Bouncefac 1.0     // try 0.5 for nonelastic collisions
#define Gravity -0.0000     // try -0.0003

// fixed values
#define GridY floor(GridX*9./16.)
#define Radius 1.0 // minimum value would be sqrt(1*1 + 1*1)/2.0 + max_velocity * 2.  so 1.0 is a safe value
#define getColorSize(grid) textureLod(iChannel0,(grid*vec2(1.,2.0)+vec2(5.1,11.1))/iResolution.xy,0.)
#define getPos(grid) textureLod(iChannel0,(grid*vec2(1.,2.0)+vec2(5.1,10.1))/iResolution.xy,0.).xy
#define getVel(grid) textureLod(iChannel0,(grid*vec2(1.,2.0)+vec2(5.1,10.1))/iResolution.xy,0.).zw
`;

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
			fragmentShader: common + `
			uniform int iFrame;
			uniform float iTime;
			uniform vec2 iResolution;
			uniform sampler2D iChannel0;
			uniform vec2 iChannelResolution0;
			varying vec2 vUv;


			void main()
			{
				vec2 grid = floor(gl_FragCoord.xy/vec2(1.0,2.0)-vec2(5.,5.));
				   float datai = floor(fract(gl_FragCoord.y/2.0)*2.0);
				if (grid.x>=float(GridX) || grid.y>=float(GridY) || grid.x<0. || grid.y<0.) {
					gl_FragColor = vec4(0.,0.,0.,0.);
					return;
				}
				
				vec2 newpos = vec2(0.,0.);
				vec2 newvel = vec2(0.,0.);
				vec4 newcolorsize = vec4(0.0,0.0,0.0,0.);
				
				
				if (iFrame<5) // init
				{
					if (mod(grid.x,2.0)==1. && mod(grid.y,3.0)==1.)
					{
						newpos  = vec2(sin(grid.y)*0.5+0.5,sin(grid.x)*0.7+0.5)+grid; // middle of the grid
						newvel = vec2(sin(grid.y),cos(grid.x*1.2))*0.3;
						
						
						float diskrad = GridX*0.24;
						if (length(grid-vec2(diskrad,diskrad*0.5))<diskrad) 
						{
							newcolorsize = vec4(0.1,0.8,1.0,1.0);
							newvel = vec2(0.,0.); // cold gas
						}
						if (length(grid-vec2(GridX-diskrad,diskrad))<diskrad)
						{
							newcolorsize = vec4(1.0,0.9,0.2,1.0);
						}
						
						if (newcolorsize.a==0.0) newpos = vec2(0.,0.);
					}
				}
				else
				{
					// check surrounding grid for particles that move to this one
					for(int x=0;x<9;x++) // for some reason nested loops compiles wrong
					{
						vec2 grid2 = grid+vec2(float(x%3-1),float(x/3-1));
			
						vec2 pos = getPos(grid2)+getVel(grid2);
						vec2 vel = getVel(grid2);
						vec4 colorsize = getColorSize(grid2);
			
						if ( floor(pos)==grid)
						{
							newpos += pos*colorsize.a;
							newvel += vel*colorsize.a;
							newcolorsize.xyz += colorsize.xyz*colorsize.a;
							newcolorsize.a += colorsize.a;
						}
					}
					
					if (newcolorsize.a>0.) // in case multiple particles hit occopy the same grid, combine their mass and average their data
					{
						newpos/=newcolorsize.a;
						newvel/=newcolorsize.a;
						newcolorsize.xyz/=newcolorsize.a;
					}
					
				
					// bouncing walls
					if (newpos.x<Radius) newvel.x = abs(newvel.x);        
					if (newpos.x>float(GridX)-Radius) newvel.x = -(newpos.x-float(GridX)+Radius); 
					if (newpos.y<Radius) newvel.y = abs(newvel.y);        
					if (newpos.y>float(GridY)-Radius) newvel.y = -abs(newvel.y); 
				
					// bouncing other molecules
					vec2 orignewvel = newvel;
					for(int y=-3;y<=3;y++)
						for(int x=-3;x<=3;x++)
						{
							vec2 grid2 = grid+vec2(float(x),float(y));
							vec2 pos = getPos(grid2)+getVel(grid2);
							if (pos!=newpos && getColorSize(grid2).a>0.)
							{
								if (length(pos-newpos)<Radius*2.)
								{
									vec2 normal = normalize(pos-newpos);
									vec2 veldif = orignewvel - getVel(grid2);
									newvel -= normal * max(dot(normal,veldif)*Bouncefac,0.);
								}
							}
						}
			
					 
					newvel.y -= Gravity;  // gracity setting in Common:
					float maxvel = 1.0; // make sure they don't jump over grids
					if (length(newvel)>maxvel) newvel *= maxvel/length(newvel); 
				}
				
				gl_FragColor = (datai==0.)?vec4(newpos,newvel):newcolorsize;
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
	}

	resize(x,y) {
		this.tgt0.setSize(x,y);
		this.tgt1.setSize(x,y);
	}
	
	render(renderer, time, frame) {
		const old = renderer.autoClear;
		renderer.autoClear = false;

		// pingpong for pass0 double buffered.
		const srcTgt = this.frame % 2 ? this.tgt0 : this.tgt1;
		const tgt = this.frame % 2 ? this.tgt1 : this.tgt0;

		this.pass0.material.uniforms.iFrame.value = this.frame;
		this.pass0.material.uniforms.iChannel0.value = srcTgt.texture;
		this.pass0.material.uniforms.iChannelResolution0.value = new THREE.Vector2(srcTgt.width, srcTgt.height);
		this.pass0.material.uniforms.iResolution.value = new THREE.Vector2(tgt.width, tgt.height);

		this.pass0.render(renderer, tgt);
		this.outputTarget = tgt;
	
		// restore original framebuffer canvas
		renderer.setRenderTarget(null);
		renderer.autoClear = old;

		this.frame++;
	}

	getOutputTarget() {
		return this.outputTarget;
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

const fragmentShader = common + `
    uniform float iTime;
    uniform vec2 iResolution;
    uniform sampler2D iChannel0;
    uniform vec2 iChannelResolution0;
    uniform sampler2D splat;

    varying vec2 vUv;
    varying vec3 n;
    varying vec3 eye;

    float time;

	/*

	Every particle is stored in the grid by the integer part of it's coordinates.
	Colors and masses are stored in every odd line of the off screen surfaces
	A grid can't be shared by more than one particle. In that rare case their 
	mass get's combined and displayed as a bug. However it's possible to implement a 
	mechanism that splits them into multiple particles again.
	
	Play with gravity, grid size and bounciness.
	
	Energy loss also occours when a particle tries to go faster than the speed limit,
	which is one grid/frame, and also when more than 2 particles collide in the same time, 
	or with the wall.
	Buffer B can measure and display the total kinetic energy of the particles.
	
	*/
	
	void main( )
	{
		vec2 uv = vUv; //fragCoord/iResolution.xy;
		vec2 pixel = uv*vec2(float(GridX),float(GridY));
		vec2 grid = floor(uv*vec2(float(GridX),float(GridY)));
		float pixelsize = float(GridX)/iResolution.x;
		vec3 col = vec3(0.0,0.,0.3);
	
		float minrad = Radius;
		for(int y=-1;y<=1;y++) // check surrounding grids for particle
			for(int x=-1;x<=1;x++)
			{
				vec2 grid2 = grid+vec2(float(x),float(y));
				vec2 pos = getPos(grid2);
				float d = length(pixel-pos);
				if (d<minrad && pos.x!=0.0)
				{
					float aa = min((minrad-d)/pixelsize,1.);
					minrad = d;
					vec3 moleculecolor = getColorSize(grid2).xyz;
					
					// show buggy joint particles blinking
					if (getColorSize(grid2).a>1.0) moleculecolor = vec3(1.,0.,0.);
					
					col = mix(col,moleculecolor,aa);
				}
			}
	
	  // debug grids in use  
		//if (getColorSize(grid).a!=0.0) col=mix(col,vec3(1.,1.,1.),getColorSize(grid).a*0.3);
		
		gl_FragColor = vec4(col,1.0);
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
