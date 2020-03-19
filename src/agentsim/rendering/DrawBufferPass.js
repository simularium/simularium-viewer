import RenderToBuffer from "./RenderToBuffer.js";

class DrawBufferPass {
    constructor() {
        this.pass = new RenderToBuffer({
            uniforms: {
                colorTex: { value: null },
                scale: { value: new THREE.Vector4(1, 1, 1, 1) },
                bias: { value: new THREE.Vector4(0, 0, 0, 0) },
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
    resize(x, y) {}

    setScale(x, y, z, w) {
        this.pass.material.uniforms.scale.value = new THREE.Vector4(x, y, z, w);
    }
    setBias(x, y, z, w) {
        this.pass.material.uniforms.bias.value = new THREE.Vector4(x, y, z, w);
    }

    render(renderer, target, bufferToDraw) {
        this.pass.material.uniforms.colorTex.value = bufferToDraw.texture;

        const c = renderer.getClearColor().clone();
        const a = renderer.getClearAlpha();
        renderer.setClearColor(new THREE.Color(1, 0, 0), 1.0);

        this.pass.render(renderer, target);

        renderer.setClearColor(c, a);
    }
}

export default DrawBufferPass;
