import SSAO1Pass from "./SSAO";
import GBufferPass from "./GBufferPass";
import BlurPass from "./GaussianBlur";
import CompositePass from "./CompositePass";
import ContourPass from "./ContourPass";
import DrawBufferPass from "./DrawBufferPass";
import HitTestHelper from "./HitTestHelper";
import { InstancedFiberGroup } from "./InstancedFiber";
import { GeometryInstanceContainer } from "../types";

import {
    Camera,
    Color,
    FloatType,
    Group,
    NearestFilter,
    RGBAFormat,
    Scene,
    WebGLMultipleRenderTargets,
    WebGLRenderer,
    WebGLRenderTarget,
} from "three";
import { Pane } from "tweakpane";

const AGENTBUFFER = 0;
const NORMALBUFFER = 1;
const POSITIONBUFFER = 2;

export interface AOSettings {
    aoradius1: number;
    blurradius1: number;
    aothreshold1: number;
    aofalloff1: number;
    aoradius2: number;
    blurradius2: number;
    aothreshold2: number;
    aofalloff2: number;
}

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
    followColor: { r: number; g: number; b: number };
    outlineColor: { r: number; g: number; b: number };
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
    public gbuffer: WebGLMultipleRenderTargets;
    private hitTestHelper: HitTestHelper;
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
            // AO defaults
            aoradius1: 1.2,
            blurradius1: 1.5,
            aothreshold1: 127.0,
            aofalloff1: 300.0,
            aoradius2: 5.77,
            blurradius2: 1.94,
            aothreshold2: 300.0,
            aofalloff2: 208.0,
            // end AO defaults
            atomBeginDistance: 50.0,
            chainBeginDistance: 100.0,
            bghueoffset: 1,
            bgchromaoffset: 0.45,
            bgluminanceoffset: 0.45,
            outlineThickness: 2.0,
            followThickness: 3.0,
            outlineAlpha: 0.8,
            followAlpha: 0.8,
            followColor: { r: 35, g: 255, b: 0 },
            outlineColor: { r: 255, g: 255, b: 255 },
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
        this.gbuffer = new WebGLMultipleRenderTargets(2, 2, 3);
        for (let i = 0, il = this.gbuffer.texture.length; i < il; i++) {
            this.gbuffer.texture[i].minFilter = NearestFilter;
            this.gbuffer.texture[i].magFilter = NearestFilter;
            this.gbuffer.texture[i].format = RGBAFormat;
            this.gbuffer.texture[i].type = FloatType;
            this.gbuffer.texture[i].generateMipmaps = false;
        }
        // Name our G-Buffer attachments for debugging
        this.gbuffer.texture[AGENTBUFFER].name = "agentinfo";
        this.gbuffer.texture[NORMALBUFFER].name = "normal";
        this.gbuffer.texture[POSITIONBUFFER].name = "position";

        this.hitTestHelper = new HitTestHelper();

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

    public applyAO(ao: AOSettings): void {
        this.parameters.aoradius1 = ao.aoradius1;
        this.parameters.aoradius2 = ao.aoradius2;
        this.parameters.aothreshold1 = ao.aothreshold1;
        this.parameters.aothreshold2 = ao.aothreshold2;
        this.parameters.aofalloff1 = ao.aofalloff1;
        this.parameters.aofalloff2 = ao.aofalloff2;
        this.parameters.blurradius1 = ao.blurradius1;
        this.parameters.blurradius2 = ao.blurradius2;
        this.ssao1Pass.setRadius(this.parameters.aoradius1);
        this.blur1Pass.setRadius(this.parameters.blurradius1);
        this.ssao2Pass.setRadius(this.parameters.aoradius2);
        this.blur2Pass.setRadius(this.parameters.blurradius2);
    }

    public setupGui(gui: Pane): void {
        const settings = this.parameters;
        const ao = gui.addFolder({ title: "AO passes", expanded: false });
        ao.addInput(settings, "aoradius1", { min: 0.01, max: 10.0 }).on(
            "change",
            (event) => {
                this.ssao1Pass.setRadius(event.value);
            }
        );
        ao.addInput(settings, "blurradius1", { min: 0.01, max: 10.0 }).on(
            "change",
            (event) => {
                this.blur1Pass.setRadius(event.value);
            }
        );
        ao.addInput(settings, "aothreshold1", { min: 0.01, max: 300.0 });
        ao.addInput(settings, "aofalloff1", { min: 0.01, max: 300.0 });
        ao.addSeparator();

        ao.addInput(settings, "aoradius2", { min: 0.01, max: 10.0 }).on(
            "change",
            (event) => {
                this.ssao2Pass.setRadius(event.value);
            }
        );
        ao.addInput(settings, "blurradius2", { min: 0.01, max: 10.0 }).on(
            "change",
            (event) => {
                this.blur2Pass.setRadius(event.value);
            }
        );
        ao.addInput(settings, "aothreshold2", { min: 0.01, max: 300.0 });
        ao.addInput(settings, "aofalloff2", { min: 0.01, max: 300.0 });
        const depth = gui.addFolder({ title: "DepthCueing", expanded: false });
        depth.addInput(settings, "atomBeginDistance", { min: 0.0, max: 300.0 });
        depth.addInput(settings, "chainBeginDistance", {
            min: 0.0,
            max: 300.0,
        });

        depth
            .addInput(settings, "bghueoffset", { min: 0.0, max: 1.0 })
            .on("change", (event) => {
                this.compositePass.setBgHueOffset(event.value);
            });
        depth
            .addInput(settings, "bgchromaoffset", { min: 0.0, max: 1.0 })
            .on("change", (event) => {
                this.compositePass.setBgChromaOffset(event.value);
            });
        depth
            .addInput(settings, "bgluminanceoffset", { min: 0.0, max: 1.0 })
            .on("change", (event) => {
                this.compositePass.setBgLuminanceOffset(event.value);
            });
        const outlines = gui.addFolder({ title: "Outlines", expanded: false });
        outlines
            .addInput(settings, "outlineThickness", {
                min: 1.0,
                max: 8.0,
                step: 1,
            })
            .on("change", (event) => {
                this.contourPass.setOutlineThickness(event.value);
            });
        outlines.addInput(settings, "outlineColor").on("change", (event) => {
            this.contourPass.setOutlineColor([
                event.value.r,
                event.value.g,
                event.value.b,
            ]);
        });

        outlines
            .addInput(settings, "outlineAlpha", { min: 0.0, max: 1.0 })
            .on("change", (event) => {
                this.contourPass.setOutlineAlpha(event.value);
            });
        outlines
            .addInput(settings, "followThickness", {
                min: 1.0,
                max: 8.0,
                step: 1,
            })
            .on("change", (event) => {
                this.contourPass.setFollowOutlineThickness(event.value);
            });
        outlines.addInput(settings, "followColor").on("change", (event) => {
            this.contourPass.setFollowColor([
                event.value.r,
                event.value.g,
                event.value.b,
            ]);
        });
        outlines
            .addInput(settings, "followAlpha", { min: 0.0, max: 1.0 })
            .on("change", (event) => {
                this.contourPass.setFollowAlpha(event.value);
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
        const tex = this.gbuffer.texture[AGENTBUFFER];
        const pixel = this.hitTestHelper.hitTest(
            renderer,
            tex,
            x / tex.image.width,
            y / tex.image.height
        );
        // (typeId), (instanceId), fragViewPos.z, fragPosDepth;

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
        instancedMeshGroup: Group,
        fibers: InstancedFiberGroup,
        meshTypes: GeometryInstanceContainer[]
    ): void {
        this.gbufferPass.setMeshGroups(instancedMeshGroup, fibers, meshTypes);
    }

    public resize(x: number, y: number): void {
        this.gbuffer.setSize(x, y);

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
        camera: Camera,
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
        this.gbufferPass.render(renderer, scene, camera, this.gbuffer);

        // 2 render ssao
        this.ssao1Pass.render(
            renderer,
            camera,
            this.ssaoBuffer,
            this.gbuffer.texture[NORMALBUFFER],
            this.gbuffer.texture[POSITIONBUFFER]
        );
        this.blur1Pass.render(
            renderer,
            this.ssaoBufferBlurred,
            this.ssaoBuffer,
            this.gbuffer.texture[POSITIONBUFFER],
            this.blurIntermediateBuffer
        );

        this.ssao2Pass.render(
            renderer,
            camera,
            this.ssaoBuffer2,
            this.gbuffer.texture[NORMALBUFFER],
            this.gbuffer.texture[POSITIONBUFFER]
        );
        this.blur2Pass.render(
            renderer,
            this.ssaoBufferBlurred2,
            this.ssaoBuffer2,
            this.gbuffer.texture[POSITIONBUFFER],
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
            this.gbuffer.texture[AGENTBUFFER]
        );

        this.contourPass.render(
            renderer,
            target,
            compositeTarget,
            // this is the buffer with the instance ids and fragdepth!
            this.gbuffer.texture[AGENTBUFFER],
            this.gbuffer.texture[NORMALBUFFER]
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
