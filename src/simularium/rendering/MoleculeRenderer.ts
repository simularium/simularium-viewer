import SSAO1Pass from "./SSAO";
import GBufferPass from "./GBufferPass";
import BlurPass from "./GaussianBlur";
import CompositePass from "./CompositePass";
import ContourPass from "./ContourPass";
import DrawBufferPass from "./DrawBufferPass";

import {
    FloatType,
    NearestFilter,
    RGBAFormat,
    WebGLRenderTarget,
    Group,
} from "three";

class MoleculeRenderer {
    public gbufferPass: GBufferPass;
    public ssao1Pass: SSAO1Pass;
    public ssao2Pass: SSAO1Pass;
    public blur1Pass: BlurPass;
    public blur2Pass: BlurPass;
    public compositePass: CompositePass;
    public contourPass: ContourPass;
    public drawBufferPass: DrawBufferPass;
    public colorBuffer: WebGLRenderTarget;
    public normalBuffer: WebGLRenderTarget;
    public positionBuffer: WebGLRenderTarget;
    public blurIntermediateBuffer: WebGLRenderTarget;
    public ssaoBuffer: WebGLRenderTarget;
    public ssaoBuffer2: WebGLRenderTarget;
    public ssaoBufferBlurred: WebGLRenderTarget;
    public ssaoBufferBlurred2: WebGLRenderTarget;

    public constructor() {
        this.gbufferPass = new GBufferPass();
        // radius, threshold, falloff in view space coordinates.
        this.ssao1Pass = new SSAO1Pass(4.5, 150, 150);
        this.ssao2Pass = new SSAO1Pass(4.5, 150, 150);
        //        this.ssao1Pass = new SSAO1Pass(0.00005, 0.38505, 0.08333);
        //        this.ssao2Pass = new SSAO1Pass(0.00125, 1.05714, 0.15188);
        this.blur1Pass = new BlurPass(10);
        this.blur2Pass = new BlurPass(10);
        this.compositePass = new CompositePass();
        this.contourPass = new ContourPass();
        this.drawBufferPass = new DrawBufferPass();

        // buffers:
        this.colorBuffer = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: true,
            stencilBuffer: false,
        });
        this.colorBuffer.texture.generateMipmaps = false;
        // TODO : MRT AND SHARE DEPTH BUFFER among color, position, normal etc
        this.normalBuffer = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: true,
            stencilBuffer: false,
        });
        this.normalBuffer.texture.generateMipmaps = false;
        this.positionBuffer = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: true,
            stencilBuffer: false,
        });
        this.positionBuffer.texture.generateMipmaps = false;

        // intermediate blurring buffer
        this.blurIntermediateBuffer = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.blurIntermediateBuffer.texture.generateMipmaps = false;

        this.ssaoBuffer = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBuffer.texture.generateMipmaps = false;
        this.ssaoBuffer2 = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBuffer2.texture.generateMipmaps = false;
        this.ssaoBufferBlurred = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBufferBlurred.texture.generateMipmaps = false;
        this.ssaoBufferBlurred2 = new WebGLRenderTarget(2, 2, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.ssaoBufferBlurred2.texture.generateMipmaps = false;
    }

    public setupGui(gui): void {
        var settings = {
            aoradius1: 2.2,
            aoradius2: 5,
            blurradius1: 1.5,
            blurradius2: 0.7,
            aothreshold1: 75,
            aofalloff1: 100,
            aothreshold2: 75,
            aofalloff2: 75,
            atomBeginDistance: 150.0,
            chainBeginDistance: 225.0,
            bghueoffset: 1,
            bgchromaoffset: 0,
            bgluminanceoffset: 0.2,
        };

        /////////////////////////////////////////////////////////////////////
        // init from settings object
        this.ssao1Pass.pass.material.uniforms.radius.value = settings.aoradius1;
        this.blur1Pass.setRadius(settings.blurradius1);
        this.ssao1Pass.pass.material.uniforms.ssaoThreshold.value =
            settings.aothreshold1;
        this.ssao1Pass.pass.material.uniforms.ssaoFalloff.value =
            settings.aofalloff1;
        this.ssao2Pass.pass.material.uniforms.radius.value = settings.aoradius2;
        this.blur2Pass.setRadius(settings.blurradius2);
        this.ssao2Pass.pass.material.uniforms.ssaoThreshold.value =
            settings.aothreshold2;
        this.ssao2Pass.pass.material.uniforms.ssaoFalloff.value =
            settings.aofalloff2;
        this.compositePass.pass.material.uniforms.atomicBeginDistance.value =
            settings.atomBeginDistance;
        this.compositePass.pass.material.uniforms.chainBeginDistance.value =
            settings.chainBeginDistance;
        this.compositePass.pass.material.uniforms.bgHCLoffset.value.x =
            settings.bghueoffset;
        this.compositePass.pass.material.uniforms.bgHCLoffset.value.y =
            settings.bgchromaoffset;
        this.compositePass.pass.material.uniforms.bgHCLoffset.value.z =
            settings.bgluminanceoffset;
        /////////////////////////////////////////////////////////////////////

        var self = this;
        gui.add(settings, "aoradius1", 0.01, 10.0).onChange(value => {
            self.ssao1Pass.pass.material.uniforms.radius.value = value;
        });
        gui.add(settings, "blurradius1", 0.01, 10.0).onChange(value => {
            self.blur1Pass.setRadius(value);
        });
        gui.add(settings, "aothreshold1", 0.01, 300.0).onChange(value => {
            self.ssao1Pass.pass.material.uniforms.ssaoThreshold.value = value;
        });
        gui.add(settings, "aofalloff1", 0.01, 300.0).onChange(value => {
            self.ssao1Pass.pass.material.uniforms.ssaoFalloff.value = value;
        });
        gui.add(settings, "aoradius2", 0.01, 10.0).onChange(value => {
            self.ssao2Pass.pass.material.uniforms.radius.value = value;
        });
        gui.add(settings, "blurradius2", 0.01, 10.0).onChange(value => {
            self.blur2Pass.setRadius(value);
        });
        gui.add(settings, "aothreshold2", 0.01, 300.0).onChange(value => {
            self.ssao2Pass.pass.material.uniforms.ssaoThreshold.value = value;
        });
        gui.add(settings, "aofalloff2", 0.01, 300.0).onChange(value => {
            self.ssao2Pass.pass.material.uniforms.ssaoFalloff.value = value;
        });

        gui.add(settings, "atomBeginDistance", 0.0, 300.0).onChange(value => {
            self.compositePass.pass.material.uniforms.atomicBeginDistance.value = value;
        });
        gui.add(settings, "chainBeginDistance", 0.0, 300.0).onChange(value => {
            self.compositePass.pass.material.uniforms.chainBeginDistance.value = value;
        });

        gui.add(settings, "bghueoffset", 0.0, 1.0).onChange(value => {
            self.compositePass.pass.material.uniforms.bgHCLoffset.value.x = value;
        });
        gui.add(settings, "bgchromaoffset", 0.0, 1.0).onChange(value => {
            self.compositePass.pass.material.uniforms.bgHCLoffset.value.y = value;
        });
        gui.add(settings, "bgluminanceoffset", 0.0, 1.0).onChange(value => {
            self.compositePass.pass.material.uniforms.bgHCLoffset.value.z = value;
        });
    }

    public setBackgroundColor(color): void {
        this.compositePass.pass.material.uniforms.backgroundColor.value = color;
    }
    public setHighlightInstance(instance: number): void {
        this.compositePass.pass.material.uniforms.highlightInstance.value = instance;
    }

    public setTypeSelectMode(isTypeSelected: boolean): void {
        this.compositePass.pass.material.uniforms.typeSelectMode.value = isTypeSelected
            ? 1
            : 0;
    }

    public hitTest(renderer, x, y): number {
        const pixel = new Float32Array(4).fill(-1);
        // (IN_typeId), (IN_instanceId), fragViewPos.z, fragPosDepth;
        renderer.readRenderTargetPixels(this.colorBuffer, x, y, 1, 1, pixel);
        if (pixel[3] === -1) {
            return -1;
        } else {
            // look up the object from its instance.
            const instance = pixel[1];
            return instance;
        }
    }

    // colorsData is a Float32Array of rgb triples
    public updateColors(numColors, colorsData): void {
        this.compositePass.updateColors(numColors, colorsData);
    }

    public setMeshGroups(
        agentMeshGroup: Group,
        agentPDBGroup: Group,
        agentFiberGroup: Group
    ): void {
        this.gbufferPass.setMeshGroups(
            agentMeshGroup,
            agentPDBGroup,
            agentFiberGroup
        );
    }

    public resize(x, y): void {
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

        this.gbufferPass.resize(x, y);
        this.ssao1Pass.resize(x, y);
        this.ssao2Pass.resize(x, y);
        this.blur1Pass.resize(x, y);
        this.blur2Pass.resize(x, y);
        this.compositePass.resize(x, y);
        this.contourPass.resize(x, y);
        this.drawBufferPass.resize(x, y);
    }

    public render(renderer, scene, camera, target): void {
        // currently rendering is a limited # of draw calls of POINTS objects and one draw call per mesh TRIANGLES object (reusing same geometry buffer)
        // transforms are happening serially on cpu side because all objects are packed into buffer
        //    could use buffer of transforms and per-instance indices to index into it
        // can't swap static LODs without looping over transforms

        // current bottleneck is uploading huge vertex buffer to GPU every time the sim updates

        // threejs does not allow:
        //   multiple render targets : i have to do 3x the vtx processing work to draw
        //   instancing is limited and not generalized : draw call overhead
        //   transform feedback (capture the post-transform state of an object and resubmit it multiple times)
        //   WEBGL_multi_draw extension support??? : draw call overhead
        //     chrome flags Enable Draft webgl extensions

        // webgl2 :  FF, Chrome, Edge, Android
        //    NOT: safari, ios safari  (due in 2020?)

        // no geometry or tessellation shaders in webgl2 at all

        // options to proceed:
        //   1. baby steps with three.js.  reconfigure rendering to use one buffer per molecule LOD and many draw calls.  test perf.
        //   2. custom webgl renderer.  could still use some threejs classes for camera, matrices and maybe canvas handling
        //   3. fork threejs and mod (some of the asked for features are languishing in PRs)
        // Both options 2 and 3 are time consuming.  #3 is probably quicker to implement, possibly less optimal JS code,
        //   more robust against varying user configs
        // we still need to maintain the simple mesh rendering for webgl1 devices.

        // Dan's time:
        //    CFE and data scripts  (h/o to J?)
        //    agave 2
        //    simularium
        //    volume-viewer smartgoals
        //    etc (ML prototype, ...)

        // DEPTH HANDLING STRATEGY:
        // gbuffer pass writes gl_FragDepth
        // depth buffer should be not written to or tested again after this.

        // 1 draw molecules into G buffers
        // TODO: MRT
        this.gbufferPass.render(
            renderer,
            scene,
            camera,
            this.colorBuffer,
            this.normalBuffer,
            this.positionBuffer
        );

        // 2 render ssao
        this.ssao1Pass.render(
            renderer,
            camera,
            this.ssaoBuffer,
            this.normalBuffer,
            this.positionBuffer
        );
        this.blur1Pass.render(
            renderer,
            this.ssaoBufferBlurred,
            this.ssaoBuffer,
            this.positionBuffer,
            this.blurIntermediateBuffer
        );

        this.ssao2Pass.render(
            renderer,
            camera,
            this.ssaoBuffer2,
            this.normalBuffer,
            this.positionBuffer
        );
        this.blur2Pass.render(
            renderer,
            this.ssaoBufferBlurred2,
            this.ssaoBuffer2,
            this.positionBuffer,
            this.blurIntermediateBuffer
        );

        // render composite pass into normal buffer, overwriting the normals data!
        const compositeTarget = this.normalBuffer;

        // render into default render target
        this.compositePass.render(
            renderer,
            camera,
            compositeTarget,
            this.ssaoBufferBlurred,
            this.ssaoBufferBlurred2,
            this.colorBuffer
        );

        this.contourPass.render(
            renderer,
            target,
            compositeTarget,
            // this is the buffer with the instance ids and fragdepth!
            this.colorBuffer
        );

        // DEBUGGING some of the intermediate buffers:
        //this.drawBufferPass.setScale(1.0 / 34.0, 1.0 / 6.0, 0, 1);
        //this.drawBufferPass.render(renderer, target, this.colorBuffer);
        //this.drawBufferPass.render(renderer, target, this.ssaoBuffer);
        //this.drawBufferPass.render(renderer, target, this.ssaoBuffer2);
        //this.drawBufferPass.render(renderer, target, this.normalBuffer);
        //this.drawBufferPass.setScale(1.0/150.0, 1.0/150.0, 1.0/150.0, 1.0/150.0);
        //this.drawBufferPass.render(renderer, target, this.positionBuffer);
    }
}

export default MoleculeRenderer;
