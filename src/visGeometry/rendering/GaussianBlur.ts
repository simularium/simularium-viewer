import { Color, Vector2, WebGLRenderer, WebGLRenderTarget } from "three";

import RenderToBuffer from "./RenderToBuffer.js";

class BlurPass1D {
    public pass: RenderToBuffer;
    private uvOffset: Vector2;
    private radius: number;
    private stdDev: number;

    public constructor(uvOffset: Vector2, radius: number, stdDev: number) {
        this.uvOffset = uvOffset;
        this.radius = 0;
        this.stdDev = 0;
        this.pass = new RenderToBuffer({
            defines: {
                KERNEL_RADIUS: 8,
            },
            uniforms: {
                colorTex: { value: null },
                viewPosTex: { value: null },
                size: { value: new Vector2(512, 512) },
                sampleUvOffsets: { value: [new Vector2(0, 0)] },
                sampleWeights: { value: [1.0] },
                depthCutoff: { value: 0.1 }, // view space
            },
            fragmentShader: /* glsl */ `

        uniform sampler2D colorTex;
        uniform sampler2D viewPosTex;

        uniform float depthCutoff;

        uniform vec2 sampleUvOffsets[ KERNEL_RADIUS + 1 ];
        uniform float sampleWeights[ KERNEL_RADIUS + 1 ];

        varying vec2 vUv;
        uniform vec2 size; // iResolution.xy

        void main() {
            vec4 viewPos4 = texture2D(viewPosTex, vUv);
            if (viewPos4.w < 1.0) discard;

            float centerViewZ = -viewPos4.z;
            bool rBreak = false, lBreak = false;

            float weightSum = sampleWeights[0];
            vec4 diffuseSum = texture2D( colorTex, vUv ) * weightSum;

            vec2 vInvSize = 1.0 / size;

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
        this.configure(radius, stdDev);
    }
    public resize(x, y): void {
        this.pass.material.uniforms.size.value = new Vector2(x, y);
    }

    public render(renderer, tgt): void {
        this.pass.render(renderer, tgt);
    }

    private createSampleWeights(
        kernelRadius: number,
        stdDev: number
    ): number[] {
        const weights: number[] = [];

        for (let i = 0; i <= kernelRadius; i++) {
            weights.push(gaussian(i, stdDev));
        }

        return weights;
    }

    private createSampleOffsets(
        kernelRadius: number,
        uvIncrement: Vector2
    ): Vector2[] {
        const offsets: Vector2[] = [];

        for (let i = 0; i <= kernelRadius; i++) {
            offsets.push(uvIncrement.clone().multiplyScalar(i));
        }

        return offsets;
    }

    public configure(kernelRadius: number, stdDev: number): void {
        if (kernelRadius !== this.radius || stdDev !== this.stdDev) {
            this.pass.material.defines["KERNEL_RADIUS"] = kernelRadius;
            this.pass.material.uniforms["sampleUvOffsets"].value =
                this.createSampleOffsets(kernelRadius, this.uvOffset);
            this.pass.material.uniforms["sampleWeights"].value =
                this.createSampleWeights(kernelRadius, stdDev);
            this.pass.material.needsUpdate = true;
            this.radius = kernelRadius;
            this.stdDev = stdDev;
        }
    }
}

function gaussian(x, stdDev) {
    return (
        Math.exp(-(x * x) / (2.0 * (stdDev * stdDev))) /
        (Math.sqrt(2.0 * Math.PI) * stdDev)
    );
}

class BlurPass {
    public blurXpass: BlurPass1D;
    public blurYpass: BlurPass1D;

    public constructor(radius: number, stdDev: number) {
        this.blurXpass = new BlurPass1D(new Vector2(1.0, 0.0), radius, stdDev);
        this.blurYpass = new BlurPass1D(new Vector2(0.0, 1.0), radius, stdDev);
    }

    public resize(x: number, y: number): void {
        this.blurXpass.resize(x, y);
        this.blurYpass.resize(x, y);
    }

    public configure(
        radius: number,
        stdDev: number,
        depthCutoff: number
    ): void {
        this.blurXpass.configure(radius, stdDev);
        this.blurXpass.pass.material.uniforms.depthCutoff.value = depthCutoff;
        this.blurYpass.configure(radius, stdDev);
        this.blurYpass.pass.material.uniforms.depthCutoff.value = depthCutoff;
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
