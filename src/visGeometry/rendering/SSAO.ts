import RenderToBuffer from "./RenderToBuffer";

import {
    Color,
    DataTexture,
    FloatType,
    RGBAFormat,
    Vector2,
    Vector3,
    PerspectiveCamera,
    WebGLRenderer,
    WebGLRenderTarget,
} from "three";

class SSAO1Pass {
    public pass: RenderToBuffer;

    public constructor() {
        this.pass = new RenderToBuffer({
            defines: {
                NUM_SAMPLES: 7,
                NUM_RINGS: 4,
            },
            uniforms: {
                normalTex: { value: null },
                viewPosTex: { value: null },
                iResolution: { value: new Vector2(2, 2) }, // 'size'

                cameraFar: { value: 100 },

                scale: { value: 1.0 },
                intensity: { value: 0.1 },
                bias: { value: 0.5 },

                minResolution: { value: 0.0 },
                kernelRadius: { value: 100.0 },
                randomSeed: { value: 0.0 },
            },
            fragmentShader: /* glsl */ `
        
                #include <common>
        
                varying vec2 vUv;
        
                uniform sampler2D viewPosTex;
                uniform sampler2D normalTex;
        
                // uniform float cameraNear;
                uniform float cameraFar;
                // uniform mat4 cameraProjectionMatrix;
                // uniform mat4 cameraInverseProjectionMatrix;
        
                uniform float scale;
                uniform float intensity;
                uniform float bias;
                uniform float kernelRadius;
                uniform float minResolution;
                uniform vec2 iResolution;// size;
                uniform float randomSeed;
        
                // RGBA depth
        
                #include <packing>
        
                vec4 getDefaultColor( const in vec2 screenPosition ) {
                    return vec4( 1.0 );
                }
        
                // float getDepth( const in vec2 screenPosition ) {
                //     return texture2D( tDepth, screenPosition ).x;
                // }
        
                // float getViewZ( const in float depth ) {
                //     #if PERSPECTIVE_CAMERA == 1
                //     return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
                //     #else
                //     return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
                //     #endif
                // }
        
                // vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {
                //     float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];
                //     vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );
                //     clipPosition *= clipW; // unprojection.
        
                //     return ( cameraInverseProjectionMatrix * clipPosition ).xyz;
                // }
        
                vec3 getViewNormal( const in vec3 viewPosition, const in vec2 screenPosition ) {
                    return unpackRGBToNormal( texture2D( normalTex, screenPosition ).xyz );
                }
        
                float scaleDividedByCameraFar;
                float minResolutionMultipliedByCameraFar;
        
                float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {
                    vec3 viewDelta = sampleViewPosition - centerViewPosition;
                    float viewDistance = length( viewDelta );
                    float scaledScreenDistance = scaleDividedByCameraFar * viewDistance;
        
                    return max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - bias) / (1.0 + pow2( scaledScreenDistance ) );
                }
        
                // moving costly divides into consts
                const float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
                const float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );
        
                float getAmbientOcclusion( const in vec3 centerViewPosition ) {
                    // precompute some variables require in getOcclusion.
                    scaleDividedByCameraFar = scale / cameraFar;
                    minResolutionMultipliedByCameraFar = minResolution * cameraFar;
                    vec3 centerViewNormal = getViewNormal( centerViewPosition, vUv );
        
                    // jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/
                    float angle = rand( vUv + randomSeed ) * PI2;
                    vec2 radius = vec2( kernelRadius * INV_NUM_SAMPLES ) / iResolution; // size;
                    vec2 radiusStep = radius;
        
                    float occlusionSum = 0.0;
                    float weightSum = 0.0;
        
                    for( int i = 0; i < NUM_SAMPLES; i ++ ) {
                        vec2 sampleUv = vUv + vec2( cos( angle ), sin( angle ) ) * radius;
                        radius += radiusStep;
                        angle += ANGLE_STEP;

                        vec4 viewPos4 = texture(viewPosTex, sampleUv).xyzw;
                        // test if this fragment has any geometry rendered on it, otherwise it's bg
                        if (viewPos4.w < 1.0) continue; 
                        vec3 sampleViewPosition = viewPos4.xyz;
    
                        occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );
                        weightSum += 1.0;
                    }
        
                    if( weightSum == 0.0 ) discard;
        
                    float ambientOcclusion = occlusionSum * ( intensity / weightSum );
                    return clamp(ambientOcclusion, 0.0, 1.0);
                }
        
                void main() {
                    vec4 viewPos4 = texture(viewPosTex, vUv).xyzw;
                    // test if this fragment has any geometry rendered on it, otherwise it's bg
                    if (viewPos4.w < 1.0) discard; 
                  
                    float centerViewZ = viewPos4.z;
                    vec3 viewPosition = viewPos4.xyz;

                    float ambientOcclusion = getAmbientOcclusion( viewPosition );
        
                    gl_FragColor = getDefaultColor( vUv );
                    gl_FragColor.xyz *=  1.0 - ambientOcclusion;
                }`,
        });
    }

    public resize(x: number, y: number): void {
        this.pass.material.uniforms.iResolution.value = new Vector2(x, y);
    }

    public render(
        renderer: WebGLRenderer,
        camera: PerspectiveCamera,
        target: WebGLRenderTarget,
        normals: WebGLTexture,
        positions: WebGLTexture
    ): void {
        this.pass.material.uniforms.viewPosTex.value = positions;
        this.pass.material.uniforms.normalTex.value = normals;

        const c = renderer.getClearColor(new Color()).clone();
        const a = renderer.getClearAlpha();
        renderer.setClearColor(new Color(1.0, 0.0, 0.0), 1.0);
        this.pass.render(renderer, target);
        renderer.setClearColor(c, a);
    }

    public createNoiseTex(): DataTexture {
        const noisedata = new Float32Array(16 * 4);
        for (let i = 0; i < 16; i++) {
            noisedata[i * 4 + 0] = Math.random() * 2.0 - 1.0;
            noisedata[i * 4 + 1] = Math.random() * 2.0 - 1.0;
            noisedata[i * 4 + 2] = 0;
            noisedata[i * 4 + 3] = 0;
        }
        // TODO half float type?
        const tex = new DataTexture(noisedata, 4, 4, RGBAFormat, FloatType);
        tex.needsUpdate = true;
        return tex;
    }

    public createSSAOSamples(): Vector3[] {
        const samples: Vector3[] = [];
        const sampleCount = 64;
        for (let i = 0; i < sampleCount; i++) {
            // hemisphere kernel in tangent space
            const sample: Vector3 = new Vector3(
                Math.random() * 2.0 - 1.0, // -1..1
                Math.random() * 2.0 - 1.0, // -1..1
                Math.random() // 0..1
            );
            sample.normalize();

            //sample.multiplyScalar(Math.random());

            // Uncomment all this to try to get better samples
            function lerp(x0: number, x1: number, alpha: number): number {
                return x0 + (x1 - x0) * alpha;
            }
            const iRelative = i / sampleCount;
            // scale samples s.t. they're more aligned to center of kernel
            const scale = lerp(0.1, 1.0, iRelative * iRelative);
            sample.multiplyScalar(scale);

            samples.push(sample);
        }
        return samples;
    }
}

export default SSAO1Pass;
