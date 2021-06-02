import SSAO1Pass from "./SSAO";
import GBufferPass from "./GBufferPass";
import BlurPass from "./GaussianBlur";
import CompositePass from "./CompositePass";
import ContourPass from "./ContourPass";
import DrawBufferPass from "./DrawBufferPass";
import { InstancedFiberGroup } from "./InstancedFiber";
import { InstancedMesh } from "./InstancedMesh";

import {
    Color,
    FloatType,
    Group,
    NearestFilter,
    RGBAFormat,
    Scene,
    WebGLRenderer,
    WebGLRenderTarget,
    PerspectiveCamera,
} from "three";
import * as dat from "dat.gui";

interface SimulariumRenderParameters {
    aoradius1: number;
    aoradius2: number;
    blurradius1: number;
    blurradius2: number;
    aothreshold1: number;
    aofalloff1: number;
    aothreshold2: number;
    aofalloff2: number;
    atomBeginDistance: number;
    chainBeginDistance: number;
    bghueoffset: number;
    bgchromaoffset: number;
    bgluminanceoffset: number;
    outlineThickness: number;
    followThickness: number;
    outlineAlpha: number;
    followAlpha: number;
    followColor: [number, number, number];
    outlineColor: [number, number, number];
}

class SimulariumRenderer {
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
    private parameters: SimulariumRenderParameters;
    private boundsNear: number;
    private boundsFar: number;

    public constructor() {
        this.parameters = {
            aoradius1: 1.2,
            aoradius2: 0.6,
            aothreshold1: 139,
            aothreshold2: 181,
            aofalloff1: 16,
            aofalloff2: 35,
            blurradius1: 1.5,
            blurradius2: 1.94,
            atomBeginDistance: 50.0,
            chainBeginDistance: 100.0,
            bghueoffset: 1,
            bgchromaoffset: 0.45,
            bgluminanceoffset: 0.45,
            outlineThickness: 2.0,
            followThickness: 3.0,
            outlineAlpha: 0.8,
            followAlpha: 0.8,
            followColor: [35, 255, 0],
            outlineColor: [255, 255, 255],
        };
        this.boundsNear = 0.0;
        this.boundsFar = 100.0;

        this.gbufferPass = new GBufferPass();
        // radius, threshold, falloff in view space coordinates.
        this.ssao1Pass = new SSAO1Pass(
            this.parameters.aoradius1,
            this.parameters.aothreshold1,
            this.parameters.aofalloff1
        );
        this.ssao2Pass = new SSAO1Pass(
            this.parameters.aoradius2,
            this.parameters.aothreshold2,
            this.parameters.aofalloff2
        );

        this.blur1Pass = new BlurPass(this.parameters.blurradius1);
        this.blur2Pass = new BlurPass(this.parameters.blurradius2);
        this.compositePass = new CompositePass({
            x: this.parameters.bghueoffset,
            y: this.parameters.bgchromaoffset,
            z: this.parameters.bgluminanceoffset,
        });
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

    public setupGui(gui: dat.GUI): void {
        const settings = this.parameters;

        gui.add(settings, "aoradius1", 0.01, 10.0).onChange((value) => {
            this.ssao1Pass.setRadius(value);
        });
        gui.add(settings, "blurradius1", 0.01, 10.0).onChange((value) => {
            this.blur1Pass.setRadius(value);
        });
        gui.add(settings, "aothreshold1", 0.01, 300.0);
        gui.add(settings, "aofalloff1", 0.01, 300.0);
        gui.add(settings, "aoradius2", 0.01, 10.0).onChange((value) => {
            this.ssao2Pass.setRadius(value);
        });
        gui.add(settings, "blurradius2", 0.01, 10.0).onChange((value) => {
            this.blur2Pass.setRadius(value);
        });
        gui.add(settings, "aothreshold2", 0.01, 300.0);
        gui.add(settings, "aofalloff2", 0.01, 300.0);

        gui.add(settings, "atomBeginDistance", 0.0, 300.0);
        gui.add(settings, "chainBeginDistance", 0.0, 300.0);

        gui.add(settings, "bghueoffset", 0.0, 1.0).onChange((value) => {
            this.compositePass.setBgHueOffset(value);
        });
        gui.add(settings, "bgchromaoffset", 0.0, 1.0).onChange((value) => {
            this.compositePass.setBgChromaOffset(value);
        });
        gui.add(settings, "bgluminanceoffset", 0.0, 1.0).onChange((value) => {
            this.compositePass.setBgLuminanceOffset(value);
        });
        gui.add(settings, "outlineThickness", 1.0, 8.0)
            .step(1)
            .onChange((value: number) => {
                this.contourPass.setOutlineThickness(value);
            });
        gui.addColor(settings, "outlineColor").onChange((value: number[]) => {
            this.contourPass.setOutlineColor(value);
        });

        gui.add(settings, "outlineAlpha", 0.0, 1.0).onChange(
            (value: number) => {
                this.contourPass.setOutlineAlpha(value);
            }
        );
        gui.add(settings, "followThickness", 1.0, 8.0)
            .step(1)
            .onChange((value: number) => {
                this.contourPass.setFollowOutlineThickness(value);
            });
        gui.addColor(settings, "followColor").onChange((value: number[]) => {
            this.contourPass.setFollowColor(value);
        });
        gui.add(settings, "followAlpha", 0.0, 1.0).onChange((value: number) => {
            this.contourPass.setFollowAlpha(value);
        });
    }

    public setBackgroundColor(color: Color): void {
        this.compositePass.setBackgroundColor(color);
    }
    public setFollowedInstance(instance: number): void {
        this.compositePass.setFollowedInstance(instance);
        this.contourPass.setFollowedInstance(instance);
    }

    public hitTest(renderer: WebGLRenderer, x: number, y: number): number {
        const pixel = new Float32Array(4).fill(-1);
        // (typeId), (instanceId), fragViewPos.z, fragPosDepth;
        renderer.readRenderTargetPixels(this.colorBuffer, x, y, 1, 1, pixel);
        if (pixel[3] === -1) {
            return -1;
        } else {
            // look up the object from its instance.
            // and round it off to nearest integer
            const instance = Math.round(pixel[1]);
            return instance;
        }
    }

    // colorsData is a Float32Array of rgb triples
    public updateColors(numColors: number, colorsData: Float32Array): void {
        this.compositePass.updateColors(numColors, colorsData);
    }

    public setMeshGroups(
        agentPDBGroup: Group,
        instancedMeshGroup: Group,
        fibers: InstancedFiberGroup,
        meshTypes: InstancedMesh[]
    ): void {
        this.gbufferPass.setMeshGroups(
            agentPDBGroup,
            instancedMeshGroup,
            fibers,
            meshTypes
        );
    }

    public resize(x: number, y: number): void {
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

    public setNearFar(n: number, f: number): void {
        this.boundsNear = n;
        this.boundsFar = f;
    }

    public render(
        renderer: WebGLRenderer,
        scene: Scene,
        camera: PerspectiveCamera,
        target: WebGLRenderTarget | null
    ): void {
        // updates for transformed bounds (should this happen in shader?)
        this.ssao1Pass.pass.material.uniforms.ssaoThreshold.value =
            this.parameters.aothreshold1 + Math.max(this.boundsNear, 0.0);
        this.ssao1Pass.pass.material.uniforms.ssaoFalloff.value =
            this.parameters.aofalloff1 + Math.max(this.boundsNear, 0.0);
        this.ssao2Pass.pass.material.uniforms.ssaoThreshold.value =
            this.parameters.aothreshold2 + Math.max(this.boundsNear, 0.0);
        this.ssao2Pass.pass.material.uniforms.ssaoFalloff.value =
            this.parameters.aofalloff2 + Math.max(this.boundsNear, 0.0);
        this.compositePass.pass.material.uniforms.atomicBeginDistance.value =
            this.parameters.atomBeginDistance + Math.max(this.boundsNear, 0.0);
        this.compositePass.pass.material.uniforms.chainBeginDistance.value =
            this.parameters.chainBeginDistance + Math.max(this.boundsNear, 0.0);

        // currently rendering is a draw call per PDB POINTS objects and one draw call per mesh TRIANGLES object (reusing same geometry buffer)

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
        //   1. custom webgl renderer.  could still use some threejs classes for camera, matrices and maybe canvas handling
        //   2. fork threejs and mod (some of the asked for features are languishing in PRs)
        // Both options are time consuming.  #2 is probably quicker to implement, possibly less optimal JS code,
        //   more robust against varying user configs
        // we still need to maintain the simple mesh rendering for webgl1 devices.

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

        // render composite pass into this buffer, overwriting whatever was there!
        // Be sure this buffer is not needed anymore!
        const compositeTarget = this.blurIntermediateBuffer;

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
            this.colorBuffer,
            this.normalBuffer
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

export default SimulariumRenderer;
