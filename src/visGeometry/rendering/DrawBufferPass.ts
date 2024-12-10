import { Color, Vector4, WebGLRenderer, WebGLRenderTarget } from "three";

import RenderToBuffer from "./RenderToBuffer.js";

class DrawBufferPass {
    public pass: RenderToBuffer;

    public constructor() {
        this.pass = new RenderToBuffer({
            uniforms: {
                colorTex: { value: null },
                scale: { value: new Vector4(1, 1, 1, 1) },
                bias: { value: new Vector4(0, 0, 0, 0) },
            },
            fragmentShader: `
            in vec2 vUv;
            
            uniform sampler2D colorTex;
            uniform vec4 scale;
            uniform vec4 bias;
            
            void main(void)
            {
                vec2 texCoords = vUv;
                vec4 col = texture(colorTex, texCoords);
                gl_FragColor = col*scale + bias;
            }
            `,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public resize(x: number, y: number): void {
        /* do nothing */
    }

    public setScale(x: number, y: number, z: number, w: number): void {
        this.pass.material.uniforms.scale.value = new Vector4(x, y, z, w);
    }

    public setBias(x: number, y: number, z: number, w: number): void {
        this.pass.material.uniforms.bias.value = new Vector4(x, y, z, w);
    }

    public render(
        renderer: WebGLRenderer,
        target: WebGLRenderTarget | null,
        bufferToDraw: WebGLRenderTarget
    ): void {
        this.pass.material.uniforms.colorTex.value = bufferToDraw.texture;

        const c = renderer.getClearColor(new Color()).clone();
        const a = renderer.getClearAlpha();
        renderer.setClearColor(new Color(1, 0, 0), 1.0);

        this.pass.render(renderer, target);

        renderer.setClearColor(c, a);
    }
}

export default DrawBufferPass;
