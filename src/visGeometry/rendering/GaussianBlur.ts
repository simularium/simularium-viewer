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
