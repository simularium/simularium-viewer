import { ShaderMaterial, Vector2 } from "three";
var dataTextureSize = 32;
var common = "\n// play values:\n#define GridX 128.          // any value between 20 to 300 is fine\n#define Bouncefac 1.0     // try 0.5 for nonelastic collisions\n#define Gravity -0.0000     // try -0.0003\n\n// fixed values\n#define GridY floor(GridX*0.5) // floor(GridX*9./16.)\n#define Radius 1.0 // minimum value would be sqrt(1*1 + 1*1)/2.0 + max_velocity * 2.  so 1.0 is a safe value\n#define getColorSize(grid) textureLod(iChannel0,(grid*vec2(1.,2.0)+vec2(5.1,11.1))/iResolution.xy,0.)\n#define getPos(grid) textureLod(iChannel0,(grid*vec2(1.,2.0)+vec2(5.1,10.1))/iResolution.xy,0.).xy\n#define getVel(grid) textureLod(iChannel0,(grid*vec2(1.,2.0)+vec2(5.1,10.1))/iResolution.xy,0.).zw\n";
var vertexShader = "\n    uniform float iTime;\n    uniform vec2 iResolution;\n\n    varying vec2 vUv;\n    varying vec3 n;\n    varying vec3 vLightFront;\n    varying vec3 vIndirectFront;\n\n    #define saturate(a) clamp( a, 0.0, 1.0 )\n\n    struct GeometricContext {\n        vec3 position;\n        vec3 normal;\n        vec3 viewDir;\n    };\n    struct IncidentLight {\n        vec3 color;\n        vec3 direction;\n        bool visible;\n    };\n\n    struct DirectionalLight {\n        vec3 direction;\n        vec3 color;\n        int shadow;\n        float shadowBias;\n        float shadowRadius;\n        vec2 shadowMapSize;\n    };\n    uniform DirectionalLight directionalLights[ 1 ];\n    void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {\n        directLight.color = directionalLight.color;\n        directLight.direction = directionalLight.direction;\n        directLight.visible = true;\n    }\n\n    struct HemisphereLight {\n        vec3 direction;\n        vec3 skyColor;\n        vec3 groundColor;\n    };\n    uniform HemisphereLight hemisphereLights[ 1 ];\n    vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in GeometricContext geometry ) {\n        float dotNL = dot( geometry.normal, hemiLight.direction );\n        float hemiDiffuseWeight = 0.5 * dotNL + 0.5;\n        vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );\n        #ifndef PHYSICALLY_CORRECT_LIGHTS\n            irradiance *= PI;\n        #endif\n        return irradiance;\n    }\n\n    void main()\t{\n        vec3 p = position.xyz;\n        vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n        vUv = uv;\n        n = normalMatrix * normal;\n\n        GeometricContext geometry;\n        geometry.position = modelViewPosition.xyz;\n        geometry.normal = normalize( n );\n        geometry.viewDir = normalize( -modelViewPosition.xyz );\n\n        // per-vertex lighting compatible with the rest of three.js\n        vLightFront = vec3(0.0);\n        \n        IncidentLight directLight;\n        getDirectionalDirectLightIrradiance( directionalLights[ 0 ], geometry, directLight );\n        float dotNL = dot( geometry.normal, directLight.direction );\n        vec3 directLightColor_Diffuse = PI * directLight.color;\n        vLightFront += saturate( dotNL ) * directLightColor_Diffuse;\n        vIndirectFront += getHemisphereLightIrradiance( hemisphereLights[ 0 ], geometry );\n\n        gl_Position = projectionMatrix * modelViewPosition;\n    }\n";
var fragmentShader = common + "\n    uniform float iTime;\n    uniform vec2 iResolution;\n    uniform vec2 uvscale;\n#if USE_SIM\n    uniform sampler2D iChannel0;\n    uniform vec2 iChannelResolution0;\n#endif\n    uniform sampler2D splat;\n\n    uniform vec3 ambientLightColor;\n\n    varying vec2 vUv;\n    varying vec3 n;\n    varying vec3 vLightFront;\n    varying vec3 vIndirectFront;\n\n    struct ReflectedLight {\n        vec3 directDiffuse;\n        vec3 directSpecular;\n        vec3 indirectDiffuse;\n        vec3 indirectSpecular;\n    };\n\n    vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {\n        vec3 irradiance = ambientLightColor;\n        #ifndef PHYSICALLY_CORRECT_LIGHTS\n            irradiance *= PI;\n        #endif\n        return irradiance;\n    }\n    struct IncidentLight {\n        vec3 color;\n        vec3 direction;\n        bool visible;\n    };\n\n    struct DirectionalLight {\n        vec3 direction;\n        vec3 color;\n        int shadow;\n        float shadowBias;\n        float shadowRadius;\n        vec2 shadowMapSize;\n    };\n    uniform DirectionalLight directionalLights[ 1 ];\n\n    float noise3D(vec3 p)\n    {\n        return fract(sin(dot(p ,vec3(12.9898,78.233,128.852))) * 43758.5453)*2.0-1.0;\n    }\n\n    float simplex3D(vec3 p)\n    {\n        \n        float f3 = 1.0/3.0;\n        float s = (p.x+p.y+p.z)*f3;\n        int i = int(floor(p.x+s));\n        int j = int(floor(p.y+s));\n        int k = int(floor(p.z+s));\n        \n        float g3 = 1.0/6.0;\n        float t = float((i+j+k))*g3;\n        float x0 = float(i)-t;\n        float y0 = float(j)-t;\n        float z0 = float(k)-t;\n        x0 = p.x-x0;\n        y0 = p.y-y0;\n        z0 = p.z-z0;\n        \n        int i1,j1,k1;\n        int i2,j2,k2;\n        \n        if(x0>=y0)\n        {\n            if(y0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order\n            else if(x0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order\n            else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }  // Z X Z order\n        }\n        else \n        { \n            if(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order\n            else if(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order\n            else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order\n        }\n        \n        float x1 = x0 - float(i1) + g3; \n        float y1 = y0 - float(j1) + g3;\n        float z1 = z0 - float(k1) + g3;\n        float x2 = x0 - float(i2) + 2.0*g3; \n        float y2 = y0 - float(j2) + 2.0*g3;\n        float z2 = z0 - float(k2) + 2.0*g3;\n        float x3 = x0 - 1.0 + 3.0*g3; \n        float y3 = y0 - 1.0 + 3.0*g3;\n        float z3 = z0 - 1.0 + 3.0*g3;\t\n                    \n        vec3 ijk0 = vec3(i,j,k);\n        vec3 ijk1 = vec3(i+i1,j+j1,k+k1);\t\n        vec3 ijk2 = vec3(i+i2,j+j2,k+k2);\n        vec3 ijk3 = vec3(i+1,j+1,k+1);\t\n                \n        vec3 gr0 = normalize(vec3(noise3D(ijk0),noise3D(ijk0*2.01),noise3D(ijk0*2.02)));\n        vec3 gr1 = normalize(vec3(noise3D(ijk1),noise3D(ijk1*2.01),noise3D(ijk1*2.02)));\n        vec3 gr2 = normalize(vec3(noise3D(ijk2),noise3D(ijk2*2.01),noise3D(ijk2*2.02)));\n        vec3 gr3 = normalize(vec3(noise3D(ijk3),noise3D(ijk3*2.01),noise3D(ijk3*2.02)));\n        \n        float n0 = 0.0;\n        float n1 = 0.0;\n        float n2 = 0.0;\n        float n3 = 0.0;\n\n        float t0 = 0.5 - x0*x0 - y0*y0 - z0*z0;\n        if(t0>=0.0)\n        {\n            t0*=t0;\n            n0 = t0 * t0 * dot(gr0, vec3(x0, y0, z0));\n        }\n        float t1 = 0.5 - x1*x1 - y1*y1 - z1*z1;\n        if(t1>=0.0)\n        {\n            t1*=t1;\n            n1 = t1 * t1 * dot(gr1, vec3(x1, y1, z1));\n        }\n        float t2 = 0.5 - x2*x2 - y2*y2 - z2*z2;\n        if(t2>=0.0)\n        {\n            t2 *= t2;\n            n2 = t2 * t2 * dot(gr2, vec3(x2, y2, z2));\n        }\n        float t3 = 0.5 - x3*x3 - y3*y3 - z3*z3;\n        if(t3>=0.0)\n        {\n            t3 *= t3;\n            n3 = t3 * t3 * dot(gr3, vec3(x3, y3, z3));\n        }\n        return 96.0*(n0+n1+n2+n3);\n        \n    }\n\n    float fbm(vec3 p)\n    {\n        float f;\n        f  = 0.50000*simplex3D( p ); p = p*2.01;\n        f += 0.25000*simplex3D( p ); p = p*2.02; //from iq\n        f += 0.12500*simplex3D( p ); p = p*2.03;\n        f += 0.06250*simplex3D( p ); p = p*2.04;\n        f += 0.03125*simplex3D( p );\n        return f;\n    }\n\n\n    /*\n\n    Every particle is stored in the grid by the integer part of it's coordinates.\n    Colors and masses are stored in every odd line of the off screen surfaces\n    A grid can't be shared by more than one particle. In that rare case their \n    mass get's combined and displayed as a bug. However it's possible to implement a \n    mechanism that splits them into multiple particles again.\n    \n    Play with gravity, grid size and bounciness.\n    \n    Energy loss also occours when a particle tries to go faster than the speed limit,\n    which is one grid/frame, and also when more than 2 particles collide in the same time, \n    or with the wall.\n    Buffer B can measure and display the total kinetic energy of the particles.\n    \n    */\n   \n#define NOISE_COLOR vec3(0.4, 0.33, 0.07)\n#define NOISE_BACKGROUND_COLOR vec3(0.075, 0.0625, 0.0)\n#define LIGHT_DIR_UV vec3(0.0, 0.0, 1.0)\n\n    void main( )\n    {\n        vec3 lightbg = vec3(1.0, 1.0, 1.0);\n        vec3 bg = vec3(0.5, 0.5, 0.5);\n\n        // 1. background noise layer\n\n        vec2 uv = vUv*2.0-1.0;\n        \n        // zoom scaling of the noise effect\n        uv *= uvscale;\n\n        float time = iTime * 1.0;\n        vec3 col = vec3(0.0);\n        float ns;\n        ns = simplex3D(vec3(time,vec2(uv)))*0.5+0.5;\n    \n        ns = ns*ns;\n\n        float delta = 0.01;\n        float nsx = simplex3D(vec3(time,vec2(uv)+vec2(delta, 0.0)))*0.5+0.5;\n        nsx = nsx*nsx;\n        float nsy = simplex3D(vec3(time,vec2(uv)+vec2(0.0, delta)))*0.5+0.5;\n        nsy = nsy*nsy;\n        float dnx = (nsx-(ns))/delta;\n        float dny = (nsy-(ns))/delta;\n        float bumpFactor = 8.0;\n\n//        float dnx = dFdx(ns);\n//        float dny = dFdy(ns);\n//        float bumpFactor = 128.0;\n\n        vec3 normal = vec3(dnx, dny, 0.0)*bumpFactor;\n        // transform this normal back into world space for proper lighting?\n        normal = (mat3(viewMatrix)) * normal;\n        normal = normalize(normal + n);\n\n        float lightfg = clamp(dot(normal, directionalLights[0].direction), 0.0, 1.0);\n\n        col = mix(NOISE_BACKGROUND_COLOR, NOISE_COLOR, 1.0 - (1.0-ns)*(1.0-ns)*lightfg);\n\n        // 2. second layer: read from the particle simulation\n#if USE_SIM\n        uv = vUv;\n\n        vec2 pixel = uv*vec2(float(GridX),float(GridY));\n        vec2 grid = floor(uv*vec2(float(GridX),float(GridY)));\n        float pixelsize = float(GridX)/iResolution.x;\n\n        float minrad = Radius;\n        vec2 minvec = vec2(0.0,0.0);\n        vec3 moleculecolor = bg;\n        float aa = 0.0;\n        for(int y=-1;y<=1;y++) // check surrounding grids for particle\n            for(int x=-1;x<=1;x++)\n            {\n                vec2 grid2 = grid+vec2(float(x),float(y));\n                vec2 pos = getPos(grid2);\n                float d = length(pixel-pos);\n                if (d<minrad && pos.x!=0.0)\n                {\n                    minvec = pixel-pos;\n                    aa = min((minrad-d)/pixelsize,1.);\n                    minrad = d;\n                    moleculecolor = getColorSize(grid2).xyz;\n                    \n                    // show buggy joint particles with different color\n                    // if (getColorSize(grid2).a>1.0) moleculecolor = vec3(1.,0.,0.);\n                }\n            }\n\n        // bumpy/lit particle normal?\n        vec3 normal = vec3(minvec, sqrt(1.0-dot(minvec, minvec)));\n        float lightfg = dot(normal, LIGHT_DIR_UV);\n\n        // final color mix:\n        col = mix(\n            col*lightbg,\n            lightfg * moleculecolor * smoothstep(0.5, 0.4, length(minvec*0.5) ) * texture2D(splat, (minvec/2.0 - 0.5) ).rgb,\n            aa);\n            \n        // debug grids in use  \n        //if (getColorSize(grid).a!=0.0) col=mix(col,vec3(1.,1.,1.),getColorSize(grid).a*0.3);\n#endif\n        ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n        reflectedLight.indirectDiffuse = getAmbientLightIrradiance( ambientLightColor );\n        reflectedLight.indirectDiffuse += vIndirectFront;\n        reflectedLight.directDiffuse = vLightFront * col;\n        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n        col = outgoingLight;\n\n        gl_FragColor = vec4(col,1.0);\n    }\n";
var membraneShader = new ShaderMaterial({
  uniforms: {
    iTime: {
      value: 1.0
    },
    iResolution: {
      value: new Vector2()
    },
    uvscale: {
      value: new Vector2(1.0, 1.0)
    },
    iChannel0: {
      value: null
    },
    iChannelResolution0: {
      value: new Vector2(dataTextureSize, dataTextureSize)
    },
    splat: {
      value: null
    },
    ///// LIGHTING
    ambientLightColor: {
      value: null
    },
    lightProbe: {
      value: null
    },
    directionalLights: {
      value: null
    },
    spotLights: {
      value: null
    },
    rectAreaLights: {
      value: null
    },
    pointLights: {
      value: null
    },
    hemisphereLights: {
      value: null
    },
    directionalShadowMap: {
      value: null
    },
    directionalShadowMatrix: {
      value: null
    },
    spotShadowMap: {
      value: null
    },
    spotShadowMatrix: {
      value: null
    },
    pointShadowMap: {
      value: null
    },
    pointShadowMatrix: {
      value: null
    }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  defines: {
    PI: "3.14159265359",
    USE_SIM: "0",
    PHYSICALLY_CORRECT_LIGHTS: "1"
  },
  lights: true
});
export default {
  membraneShader: membraneShader
};