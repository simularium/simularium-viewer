import { Color, Vector2, WebGLRenderer, WebGLRenderTarget } from "three";

import RenderToBuffer from "./RenderToBuffer";

class BlurXPass {
    public pass: RenderToBuffer;

    public constructor() {
        this.pass = new RenderToBuffer({
            uniforms: {
                size: { value: new Vector2(2, 2) },
                colorTex: { value: null },
                viewPosTex: { value: null },
                amount: { value: 2 },
            },
            fragmentShader: `
            in vec2 vUv;
            
            uniform sampler2D colorTex;
            uniform sampler2D viewPosTex;
            // "radius" in framebuffer pixels
            uniform float amount;
            uniform vec2 size;
            
            //layout(location = 0) out vec4 out_col;
            
            void main(void)
            {
                vec2 texCoords = vUv;
                float step = 1.0 / (size.x);
            
                vec4 texel, color = vec4(0.0);
                int i;
                float w, sum = 0.0;
            
                // in view space depth coordinates
                const float depthThreshold = 1.0;//0.0001;
            
                if (amount == 0.0)
                {
                    color = texture(colorTex, texCoords);
                    sum = 1.0;
                }
                else
                {
                    int iAmount = int((amount) + 1.0);
                    float currentDepth = texture(viewPosTex, texCoords).z;
                    for (i = -iAmount; i <= iAmount; i++)
                    {
                        float sampleDepth = texture(viewPosTex, texCoords + vec2(float(i) * step, 0.0)).z;
                        if (abs(currentDepth - sampleDepth) < depthThreshold) {
                            texel = texture(colorTex, texCoords + vec2(float(i) * step, 0.0));
                            w = exp(-pow(float(i) / amount * 1.5, 2.0));
                            //w = 1.0;
                            color += texel * w;
                            sum += w;
                        }
                    }
                }
            
                //out_col = color / sum;
                gl_FragColor = color / sum;
            }
                        `,
        });
    }

    public resize(x, y): void {
        this.pass.material.uniforms.size.value = new Vector2(x, y);
    }

    public render(renderer, tgt): void {
        this.pass.render(renderer, tgt);
    }
}

class BlurYPass {
    public pass: RenderToBuffer;

    public constructor() {
        this.pass = new RenderToBuffer({
            uniforms: {
                size: { value: new Vector2(2, 2) },
                colorTex: { value: null },
                viewPosTex: { value: null },
                amount: { value: 2 },
            },
            fragmentShader: `
            in vec2 vUv;
            
            uniform sampler2D colorTex;
            uniform sampler2D viewPosTex;
            // "radius" in framebuffer pixels
            uniform float amount;
            uniform vec2 size;
            
            //layout(location = 0) out vec4 out_col;
            
            void main(void)
            {
                vec2 texCoords = vUv;
                float step = 1.0 / (size.y);
            
                vec4 texel, color = vec4(0.0);
                int i;
                float w, sum = 0.0;
            
                // in view space depth coordinates
                const float depthThreshold = 1.0;//0.0001;
            
                if (amount == 0.0)
                {
                    color = texture(colorTex, texCoords);
                    sum = 1.0;
                }
                else
                {
                    int iAmount = int((amount) + 1.0);
                    float currentDepth = texture(viewPosTex, texCoords).z;
                    for (i = -iAmount; i <= iAmount; i++)
                    {
                        float sampleDepth = texture(viewPosTex, texCoords + vec2(0.0, float(i) * step)).z;
                        if (abs(currentDepth - sampleDepth) < depthThreshold) {
                            texel = texture(colorTex, texCoords + vec2(0.0, float(i) * step));
                            w = exp(-pow(float(i) / amount * 1.5, 2.0));
                            //w = 1.0;
                            color += texel * w;
                            sum += w;
                        }
                    }
                }
            
                //out_col = color / sum;
                gl_FragColor = color / sum;
            }
                                    `,
        });
    }

    public resize(x, y): void {
        this.pass.material.uniforms.size.value = new Vector2(x, y);
    }

    public render(renderer, tgt): void {
        this.pass.render(renderer, tgt);
    }
}

class BlurPass1D {
    public pass: RenderToBuffer;

    public constructor() {
        this.pass = new RenderToBuffer({
            defines: {
                KERNEL_RADIUS: 4,
                DEPTH_PACKING: 1,
                PERSPECTIVE_CAMERA: 1,
            },
            uniforms: {
                colorTex: { value: null },
                size: { value: new Vector2(512, 512) },
                sampleUvOffsets: { value: [new Vector2(0, 0)] },
                sampleWeights: { value: [1.0] },
                viewPosTex: { value: null },
                // cameraNear: { value: 10 },
                // cameraFar: { value: 1000 },
                depthCutoff: { value: 10 }, // view space
            },
            fragmentShader: /* glsl */ `

		#include <common>
		#include <packing>

        uniform sampler2D colorTex;
        uniform sampler2D viewPosTex;

//		uniform float cameraNear;
//		uniform float cameraFar;
		uniform float depthCutoff;

		uniform vec2 sampleUvOffsets[ KERNEL_RADIUS + 1 ];
		uniform float sampleWeights[ KERNEL_RADIUS + 1 ];

		varying vec2 vUv;
		varying vec2 vInvSize; // 1.0 / iResolution.xy

		// float getDepth( const in vec2 screenPosition ) {
		// 	#if DEPTH_PACKING == 1
		// 	return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
		// 	#else
		// 	return texture2D( tDepth, screenPosition ).x;
		// 	#endif
		// }

		// float getViewZ( const in float depth ) {
		// 	#if PERSPECTIVE_CAMERA == 1
		// 	return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
		// 	#else
		// 	return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
		// 	#endif
		// }

		void main() {
            vec4 viewPos4 = texture2D(viewPosTex, vUv);
            if (viewPos4.w < 1.0) discard; 

			float centerViewZ = -viewPos4.z;
			bool rBreak = false, lBreak = false;

			float weightSum = sampleWeights[0];
			vec4 diffuseSum = texture2D( colorTex, vUv ) * weightSum;

			for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {

				float sampleWeight = sampleWeights[i];
				vec2 sampleUvOffset = sampleUvOffsets[i] * vInvSize;

				vec2 sampleUv = vUv + sampleUvOffset;
				float viewZ = -texture2D(viewPosTex, sampleUv).z;

				if( abs( viewZ - centerViewZ ) > depthCutoff ) rBreak = true;

				if( ! rBreak ) {
					diffuseSum += texture2D( colorTex, sampleUv ) * sampleWeight;
					weightSum += sampleWeight;
				}

				sampleUv = vUv - sampleUvOffset;
				viewZ = -texture2D(viewPosTex, sampleUv).z;

				if( abs( viewZ - centerViewZ ) > depthCutoff ) lBreak = true;

				if( ! lBreak ) {
					diffuseSum += texture2D( colorTex, sampleUv ) * sampleWeight;
					weightSum += sampleWeight;
				}

			}

			gl_FragColor = diffuseSum / weightSum;
		}`,
        });
    }
    public resize(x, y): void {
        this.pass.material.uniforms.size.value = new Vector2(x, y);
    }

    public render(renderer, tgt): void {
        this.pass.render(renderer, tgt);
    }
}

function gaussian(x, stdDev) {
    return (
        Math.exp(-(x * x) / (2.0 * (stdDev * stdDev))) /
        (Math.sqrt(2.0 * Math.PI) * stdDev)
    );
}

const BlurShaderUtils = {
    createSampleWeights: function (kernelRadius: number, stdDev: number) {
        const weights: number[] = [];

        for (let i = 0; i <= kernelRadius; i++) {
            weights.push(gaussian(i, stdDev));
        }

        return weights;
    },

    createSampleOffsets: function (kernelRadius: number, uvIncrement: Vector2) {
        const offsets: Vector2[] = [];

        for (let i = 0; i <= kernelRadius; i++) {
            offsets.push(uvIncrement.clone().multiplyScalar(i));
        }

        return offsets;
    },

    configure: function (material, kernelRadius, stdDev, uvIncrement) {
        material.defines["KERNEL_RADIUS"] = kernelRadius;
        material.uniforms["sampleUvOffsets"].value =
            BlurShaderUtils.createSampleOffsets(kernelRadius, uvIncrement);
        material.uniforms["sampleWeights"].value =
            BlurShaderUtils.createSampleWeights(kernelRadius, stdDev);
        material.needsUpdate = true;
    },
};

class BlurPass {
    public blurXpass: BlurXPass;
    public blurYpass: BlurYPass;

    public constructor(radius: number) {
        this.blurXpass = new BlurXPass();
        this.blurYpass = new BlurYPass();

        this.setRadius(radius);
    }

    public resize(x: number, y: number): void {
        this.blurXpass.resize(x, y);
        this.blurYpass.resize(x, y);
    }

    public setRadius(r: number): void {
        this.blurXpass.pass.material.uniforms.amount.value = r;
        this.blurYpass.pass.material.uniforms.amount.value = r;
    }

    public render(
        renderer: WebGLRenderer,
        target: WebGLRenderTarget,
        source: WebGLRenderTarget,
        positions: WebGLTexture,
        intermediateBuffer: WebGLRenderTarget
    ): void {
        const c = renderer.getClearColor(new Color()).clone();
        const a = renderer.getClearAlpha();
        renderer.setClearColor(new Color(1.0, 1.0, 1.0), 1.0);

        // blur src into dest in two passes with an intermediate buffer (separable filter)

        // x = ( src,  viewpos ) --> intermediate
        // y = ( intermediate, viewpos ) --> dest

        this.blurXpass.pass.material.uniforms.colorTex.value = source.texture;
        this.blurXpass.pass.material.uniforms.viewPosTex.value = positions;

        this.blurXpass.render(renderer, intermediateBuffer);

        this.blurYpass.pass.material.uniforms.colorTex.value =
            intermediateBuffer.texture;
        this.blurYpass.pass.material.uniforms.viewPosTex.value = positions;

        this.blurYpass.render(renderer, target);

        renderer.setClearColor(c, a);
    }
}

export default BlurPass;
