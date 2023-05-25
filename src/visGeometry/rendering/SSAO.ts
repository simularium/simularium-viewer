import RenderToBuffer from "./RenderToBuffer";

import {
    Color,
    Vector2,
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
                beginFalloffDistance: { value: 0.0 },
                endFalloffDistance: { value: 100.0 },
            },
            fragmentShader: /* glsl */ `

                #include <common>

                varying vec2 vUv;

                uniform sampler2D viewPosTex;
                uniform sampler2D normalTex;

                uniform float cameraFar;

                uniform float scale;
                uniform float intensity;
                uniform float bias;
                uniform float kernelRadius;
                uniform float minResolution;
                uniform vec2 iResolution;// size;
                uniform float randomSeed;
                uniform float beginFalloffDistance;
                uniform float endFalloffDistance;

                vec3 getViewNormal( const in vec2 screenPosition ) {
                    vec3 n = texture2D( normalTex, screenPosition ).xyz;
                    return 2.0 * n - 1.0;
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

                float getAmbientOcclusion( const in vec3 centerViewPosition, const in float depthInterpolant ) {
                    // precompute some variables require in getOcclusion.
                    scaleDividedByCameraFar = scale / cameraFar;
                    minResolutionMultipliedByCameraFar = minResolution * cameraFar;
                    vec3 centerViewNormal = getViewNormal( vUv );

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

                    float ambientOcclusion = occlusionSum * ( intensity / weightSum ) * (1.0-depthInterpolant);
                    return clamp(ambientOcclusion, 0.0, 1.0);
                }

                void main() {
                    vec4 viewPos4 = texture(viewPosTex, vUv).xyzw;
                    // test if this fragment has any geometry rendered on it, otherwise it's bg
                    if (viewPos4.w < 1.0) discard;

                    vec3 viewPosition = viewPos4.xyz;
                    float eyeZ = -viewPosition.z;
                    float depthInterpolant = mix(0.0, 1.0, clamp((eyeZ-beginFalloffDistance)/(endFalloffDistance-beginFalloffDistance), 0.0, 1.0));
                    //float depthInterpolant = smoothstep(beginFalloffDistance, endFalloffDistance, eyeZ);

                    float ambientOcclusion = getAmbientOcclusion( viewPosition, depthInterpolant );

                    gl_FragColor = vec4(vec3(1.0-ambientOcclusion), 1.0);
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
}

export default SSAO1Pass;
