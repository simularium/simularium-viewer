// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

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
// --- Workey noise ---    Fabrice Neyret, July 2013

#define TYPE 33    // shader tunings: 1,11,12,  2,21,22,  3,31,32,33,34, 4,41
                   //                 -1 = autodemo

#define MODULATE 1
#define ANIM true

#define DENSITY 10.0
//#define DENSITY 40.0
// --- noise functions from https://www.shadertoy.com/view/XslGRr
// Created by inigo quilez - iq/2013
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

mat3 m = mat3( 0.00,  0.80,  0.60,
              -0.80,  0.36, -0.48,
              -0.60, -0.48,  0.64 );

float hash( float n )
{
    return fract(sin(n)*43758.5453);
}

float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);

    f = f*f*(3.0-2.0*f);

    float n = p.x + p.y*57.0 + 113.0*p.z;

    float res = mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                        mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
                    mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                        mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
    return res;
}

float fbm( vec3 p )
{
    float f;
    f  = 0.5000*noise( p ); p = m*p*2.02;
    f += 0.2500*noise( p ); p = m*p*2.03;
    f += 0.1250*noise( p ); p = m*p*2.01;
    f += 0.0625*noise( p );
    return f;
}
// --- End of Created by inigo quilez

// gives a random 1..N integer for index i
//#define rnd(i,N) int(1.+float(N)*hash(float(i)))
int rnd(float i,int N) { return int(1.+float(N)*hash(i)); }

// gives a random 1..N integer every T seconds, starting at i.
//#define rndT(i,N,T) int(1.+float(N)*hash(float(i)+floor(iTime/(T))))
int rndT(float i,int N,float T) { return int(1.+float(N)*hash(i+floor(iTime/(T)))); }

vec2 noise2_2( vec2 p )     // 2 noise channels from 2D position
{
	vec3 pos = vec3(p,.5);
	if (ANIM) pos.z += time;
	pos *= m;
    float fx = noise(pos);
    float fy = noise(pos+vec3(1345.67,0,45.67));
    return vec2(fx,fy);
}
vec3 noise3_2( vec2 p )     // 3 noise channels from 2D position
{
	vec3 pos = vec3(p,.5);
	if (ANIM) pos.z += time;
	pos *= m;
    float fx = noise(pos);
    float fy = noise(pos+vec3(1345.67,0,45.67));
    float fz = noise(pos+vec3(0,134.67,3245.67));
    return vec3(fx,fy,fz);
}
vec2 noise2_3( vec3 p )     // 2 noise channels from 3D position
{
	if (ANIM) p.z += time;
	p *= m;
    float fx = noise(p);
    float fy = noise(p+vec3(1345.67,0,45.67));
    return vec2(fx,fy);
}
vec3 noise3_3( vec3 p )     // 3 noise channels from 3D position
{
	if (ANIM) p.z += time;
	p *= m;
    float fx = noise(p);
    float fy = noise(p+vec3(1345.67,0,45.67));
    float fz = noise(p+vec3(0,134.67,3245.67));
    return vec3(fx,fy,fz);
}

vec2 fbm2( vec2 p )
{
	if (ANIM) p += iTime;
    float fx = fbm(vec3(p,.5));
    float fy = fbm(vec3(p,.5)+vec3(1345.67,0,45.67));
    return vec2(fx,fy);
}
vec2 perturb2(vec2 p, float scaleX, float scaleI)
{
    scaleX *= 2.;
	return scaleI*scaleX*fbm2(p/scaleX); // usually, to be added to p
}

// --- Worley -------------------------------------------------

#define id(i,j,k)   (float(128+i)+256.*float(128+j)+65536.*float(k))  
#define id2cell(id) vec3(mod(id,256.)-128.,mod(floor(id/256.),256.)-128.,id/65536.)

// d2 and id are vectors or 4 sorted distances + corresponding cell id
// id is relative to current position (add floor(p) to get absolute cell id).
void sort(float tmp_d2, int i, int j, int k, inout vec4 d2, inout vec4 id)
{
	if (tmp_d2 < d2.x)
	{                                         // nearest point
		d2.yzw = d2.xyz; d2.x = tmp_d2;
		id.yzw = id.xyz; id.x = id(i,j,k);
	}
	else if (tmp_d2 < d2.y)
	{                                         // 2nd nearest point
		d2.zw = d2.yz; d2.y = tmp_d2;
		id.zw = id.yz; id.y = id(i,j,k);
	}	
	else if (tmp_d2 < d2.z)
	{                                         // 3rd nearest point
		d2.w = d2.z; d2.z = tmp_d2;
		id.w = id.z; id.z = id(i,j,k);
	}
	else 
	{                                         // 4th nearest point
		d2.w = tmp_d2;
		id.w = id(i,j,k);
	}
}

vec4 worley2( in vec2 p, out vec4 id ) // 2D procedural texture
{
	vec2 ip = floor(p);
	vec4 d2 = vec4(1.e30); // 4 nearests initialized to infinity
	
	for (int j=-2; j<=2; j++)          // browse points in neighborhood cells
		for (int i=-2; i<=2; i++)
		{
			vec2 tmp_p   = ip+vec2(float(i),float(j)); // one cell
			vec2 tmp_pos = tmp_p+noise2_2(tmp_p)-p;    // pixel pos to cell point
			float tmp_d2 = dot(tmp_pos,tmp_pos);       // square distance of it
			sort (tmp_d2, i,j,0, d2,id);
		}
	id += vec4(ip.x+256.*ip.y); // id = vector of nearest cells
	return sqrt(d2);      // return vector of nearest distances
}

vec4 worley3( in vec3 p, out vec4 id ) // 3D procedural texture
{
	vec3 ip = floor(p);
	vec4 d2 = vec4(1.e30); // 4 nearests initialized to infinity
	
	for (int k=-2; k<=2; k++)          // browse points in neighborhood cells
	  for (int j=-2; j<=2; j++)       
		for (int i=-2; i<=2; i++)
		{
			vec3 tmp_p   = ip+vec3(float(i),float(j),float(k));  // one cell
			vec3 tmp_pos = tmp_p+noise3_3(tmp_p)-p;   // pixel pos to cell point
			float tmp_d2 = dot(tmp_pos,tmp_pos);      // square distance of it
			sort (tmp_d2, i,j,k, d2,id);
		}
	id += vec4(ip.x+256.*ip.y+65536.*ip.z); // id = vector of nearest cells
	return sqrt(d2);      // return vector of nearest distances
}

vec3 cellId2Color(float id)
{
	return texture2D(iChannel0, vec2(mod(id,64.)/64., mod(floor(id/64.),64.)/64.)).rgb;
}

void main()
{
	time = iTime;
    vec2 uv  = vUv;//fragCoord.xy / iResolution.y;
	vec2 mouse = vec2(0.0, 0.0);//iMouse.xy / iResolution.y;
	uv  = (uv  - mouse)/(1.+mouse.y);
	vec3 col;
	float c;

	
#if TYPE == -1 // demo mode 
	float duv = -.3*sin(4.*uv.y+uv.x+time) - .1*sin(10.*uv.y+6.*uv.x+10.*time);
	float k = floor(.7*(uv.x+duv)+time/5.); 
    int demo = rnd(k,13);
#else
	const int demo=0;
#endif
	
#if MODULATE
	time = 1.*(2.*time + .5*sin(1.*time+10.*length(uv)));
#endif
	
	vec4 id; vec4 D = worley2(DENSITY*uv, id);

    if((TYPE == 1)||(demo==1))
	{
		col = vec3(D.x);
	}
    else if ((TYPE == 11)||(demo==2))
	{
		c = D.x + .5*worley2(20.*uv, id).x + .25*worley2(40.*uv, id).x;
		c = 1.-c;
		col = vec3(c);
	}
	else if ((TYPE == 12)||(demo==3))
	{
		col = vec3(D.x, worley2(20.*uv, id).x, worley2(40.*uv, id).x);
	}
	
	
	else if ((TYPE == 2)||(demo==4))
	{
		col = vec3(D.y-D.x);
	}
	else if ((TYPE == 21)||(demo==5))
	{
		float I=1.;
		c = (D.y-D.x);
		I*=.5; uv*=2.; D = I*worley2(10.*uv, id); c += (D.y-D.x);
		I*=.5; uv*=2.; D = I*worley2(10.*uv, id); c += (D.y-D.x);
		col = .75*vec3(c);
	}
	else if ((TYPE == 22)||(demo==6))
	{
		float I=1.;
		c = (D.y-D.x);
		I*=.5; uv*=2.; D = I*worley2(10.*uv, id); c -= (D.y-D.x);
		I*=.5; uv*=2.; D = I*worley2(10.*uv, id); c += (D.y-D.x);
		col = vec3(c);
	}
	
	if ((TYPE == 3)||(demo==7))
	{
		c =.7*D.y-D.x; 
		col = (c<0.)? -c*vec3(2.,.5,0.) : 2.*c*cellId2Color(id.x);
	}
	else if ((TYPE == 31)||(demo==8))
	{
		//c = (.7*D.y-D.x); 
		c=D.x*(.7*D.y-D.x); 
		col = (c<0.)? vec3(-c) : (1.-c)*cellId2Color(id.x);
	}
	else if ((TYPE == 32)||(demo==9))
	{
		c=pow(D.x,.5)*(.7*D.y-D.x); 
		col = (c<0.)? vec3(-c) : 9.*c*cellId2Color(id.x);
	}
	else if ((TYPE == 33)||(demo==10))	
	{
		c=.7*D.y-D.x; 
		D = worley2(80.*uv, id); c -= .5*D.x;
		col = (c<0.)? -2.*c*cellId2Color(id.x) : 4.*c*cellId2Color(id.x);
//		col = (c<0.)? vec3(0.0) : 4.*c*cellId2Color(id.x);
	}
	else if ((TYPE == 34)||(demo==11))
	{
		float id0=id.x;
		c= (.7*D.y-D.x); 
		D = worley2(60.*uv, id); c -= .2*D.x;
		c = mix(-.1,1.,c);
		col = (c<0.)? -c*vec3(1.,.5,0.) : 3.*(1.-sqrt(c))*cellId2Color(id0);
	}
	
	else if ((TYPE == 4)||(demo==12))
	{
		uv -= .1*noise2_2(id2cell(id.x).xy);
    uv = mod( uv, 1.);
//    uv = mod( uv*vec2(iResolution.y/iResolution.x,1.), 1.);
		c = pow(D.y-D.x,.1);
		// c += pow(1.-D.x,5.);
//		col = c*texture(iChannel1,uv).rgb;
		col = vec3(c);
	}
	else if ((TYPE == 41)||(demo==13))	
	{
		uv -= .1*noise2_2(id2cell(id.x).xy);
    uv = mod( uv, 1.);
//    uv = mod( uv*vec2(iResolution.y/iResolution.x,1.), 1.);
		c=D.x*(.7*D.y-D.x); 
//		col = (c<0.)? vec3(-c) : (1.-c)*cellId2Color(id.x)*2.*texture(iChannel1,uv).rgb;
		col = (c<0.)? vec3(-c) : (1.-c)*cellId2Color(id.x)*2.;
	}
         
  float lum = dot(col, vec3(0.2125, 0.7154, 0.0721));
  vec3 N = n;//*lum;
  //col = col * max(0.0, dot(N, normalize(eye)));
  col = col * abs(dot(N, normalize(eye)));
    gl_FragColor = vec4(col, 1.0);//dot(col, vec3(0.2125, 0.7154, 0.0721)) + 0.4 ); 
}
`;

const material = new THREE.ShaderMaterial({
    uniforms: {
        color: { value: new THREE.Color(0x44ff44)},
        iTime: { value: 1.0 },
        iResolution: { value: new THREE.Vector2() },
        iChannel0: { value: new THREE.TextureLoader().load('assets/colornoise.png') },
		iChannel0: { value: null },
		iChannelResolution0: { value: new THREE.Vector2(2, 2) },
		splat: { value: new THREE.TextureLoader().load("assets/splat.png") },

        ambientLightColor: {},
        lightProbe: {},
        directionalLights: {},
        spotLights: {},
        rectAreaLights: {},
        pointLights: {},
        hemisphereLights: {},
  
        directionalShadowMap: {},
        directionalShadowMatrix: {},
        spotShadowMap: {},
        spotShadowMatrix: {},
        pointShadowMap: {},
        pointShadowMatrix: {},
    },        
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    lights: true,
});

// const composer = new THREE.EffectComposer(renderer);
// composer.addPass(new THREE.RenderPass(scene, camera));

// const pass = new THREE.ShaderPass(drawShader);
// // pass.renderToScreen = true;
// composer.addPass(pass);

export default { 
	MembraneShaderSim: null,
	MembraneShader: material
};
