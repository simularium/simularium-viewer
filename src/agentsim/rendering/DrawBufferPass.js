import RenderToBuffer from "./RenderToBuffer.js";

class DrawBufferPass {
    constructor() {
        this.pass = new RenderToBuffer({
            uniforms: {
                colorTex: { value: null },
            },
            fragmentShader: `
            in vec2 vUv;
            
            uniform sampler2D colorTex;
            
            void main(void)
            {
                vec2 texCoords = vUv;
                vec4 col = texture(colorTex, texCoords);
                gl_FragColor = col;
            }
            `
        });
    }
    resize(x, y) {

    }
    render(renderer, target, bufferToDraw) {
        this.pass.material.uniforms.colorTex.value = bufferToDraw.texture;

        const c = renderer.getClearColor();
        const a = renderer.getClearAlpha();
        renderer.setClearColor(new THREE.Color(1, 0, 0), 1.0);

        this.pass.render(renderer, target);

        renderer.setClearColor(c, a);
    }
}

export default DrawBufferPass;
