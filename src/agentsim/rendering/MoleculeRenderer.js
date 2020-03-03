import SSAO1Pass from "./SSAO";
import MoleculePass from "./MoleculePass";
import BlurPass from "./GaussianBlur";
import CompositePass from "./CompositePass";
import DrawBufferPass from "./DrawBufferPass";

class MoleculeRenderer {
    constructor() {
        this.gbufferPass = new MoleculePass();
        this.ssao1Pass = new SSAO1Pass(0.00005, 0.38505, 0.08333);
        this.ssao2Pass = new SSAO1Pass(0.00125, 1.05714, 0.15188);
        this.blur1Pass = new BlurPass(1);
        this.blur2Pass = new BlurPass(1);
        this.compositePass = new CompositePass();
        this.drawBufferPass = new DrawBufferPass();

        // buffers:
        this.colorBuffer = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: true,
            stencilBuffer: false,
        });
        this.colorBuffer.texture.generateMipmaps = false;    
        // TODO : MRT AND SHARE DEPTH BUFFER among color, position, normal etc
        this.normalBuffer = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: true,
            stencilBuffer: false,
        });
        this.normalBuffer.texture.generateMipmaps = false;    
        this.positionBuffer = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: true,
            stencilBuffer: false,
        });
        this.positionBuffer.texture.generateMipmaps = false;    

        // intermediate blurring buffer
        this.blurIntermediateBuffer = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.blurIntermediateBuffer.texture.generateMipmaps = false;    

        this.ssaoBuffer = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBuffer.texture.generateMipmaps = false;    
        this.ssaoBuffer2 = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBuffer2.texture.generateMipmaps = false;    
        this.ssaoBufferBlurred = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBufferBlurred.texture.generateMipmaps = false;    
        this.ssaoBufferBlurred2 = new THREE.WebGLRenderTarget(2, 2, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBufferBlurred2.texture.generateMipmaps = false;    

    }

    // TODO this is a geometry/scene update and should be updated through some other means?
    updateMolecules(positions, numVertices) {
        this.gbufferPass.update(positions, numVertices);
    }
    createMoleculeBuffer(n) {
        this.gbufferPass.createMoleculeBuffer(n);
    }

    resize(x, y) {
        this.colorBuffer.setSize(x, y);
        // TODO : MRT AND SHARE DEPTH BUFFER
        this.normalBuffer.setSize(x, y);
        this.positionBuffer.setSize(x, y);
        // intermediate blurring buffer
        this.blurIntermediateBuffer.setSize(x, y);
        this.ssaoBuffer.setSize(x, y);
        this.ssaoBuffer2.setSize(x, y);
        this.ssaoBufferBlurred.setSize(x, y);
        this.ssaoBufferBlurred2.setSize(x, y);

        this.gbufferPass.resize(x,y);
        this.ssao1Pass.resize(x,y);
        this.ssao2Pass.resize(x,y);
        this.blur1Pass.resize(x,y);
        this.blur2Pass.resize(x,y);
        this.compositePass.resize(x,y);
        this.drawBufferPass.resize(x,y);
    }

    render(renderer, camera, target) {
        // 1 draw molecules into G buffers
        // TODO : MRT
        this.gbufferPass.render(renderer, camera, this.colorBuffer, this.normalBuffer, this.positionBuffer);

        // 2 render ssao
        this.ssao1Pass.render(renderer, camera, this.ssaoBuffer, this.normalBuffer, this.positionBuffer);
        this.blur1Pass.render(renderer, this.ssaoBufferBlurred, this.ssaoBuffer, this.positionBuffer, this.blurIntermediateBuffer);

        this.ssao2Pass.render(renderer, camera, this.ssaoBuffer2, this.normalBuffer, this.positionBuffer);
        this.blur2Pass.render(renderer, this.ssaoBufferBlurred2, this.ssaoBuffer2, this.positionBuffer, this.blurIntermediateBuffer);

        // render into default render target
//        this.compositePass.render(renderer, target, this.ssaoBufferBlurred, this.ssaoBufferBlurred2, this.colorBuffer);

        this.drawBufferPass.render(renderer, target, this.colorBuffer);
    }
}

export default MoleculeRenderer;