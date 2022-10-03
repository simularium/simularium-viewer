function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import SSAO1Pass from "./SSAO";
import GBufferPass from "./GBufferPass";
import BlurPass from "./GaussianBlur";
import CompositePass from "./CompositePass";
import ContourPass from "./ContourPass";
import DrawBufferPass from "./DrawBufferPass";
import { FloatType, NearestFilter, RGBAFormat, WebGLRenderTarget } from "three";

var MoleculeRenderer = /*#__PURE__*/function () {
  function MoleculeRenderer() {
    _classCallCheck(this, MoleculeRenderer);

    _defineProperty(this, "gbufferPass", void 0);

    _defineProperty(this, "ssao1Pass", void 0);

    _defineProperty(this, "ssao2Pass", void 0);

    _defineProperty(this, "blur1Pass", void 0);

    _defineProperty(this, "blur2Pass", void 0);

    _defineProperty(this, "compositePass", void 0);

    _defineProperty(this, "contourPass", void 0);

    _defineProperty(this, "drawBufferPass", void 0);

    _defineProperty(this, "colorBuffer", void 0);

    _defineProperty(this, "normalBuffer", void 0);

    _defineProperty(this, "positionBuffer", void 0);

    _defineProperty(this, "blurIntermediateBuffer", void 0);

    _defineProperty(this, "ssaoBuffer", void 0);

    _defineProperty(this, "ssaoBuffer2", void 0);

    _defineProperty(this, "ssaoBufferBlurred", void 0);

    _defineProperty(this, "ssaoBufferBlurred2", void 0);

    _defineProperty(this, "parameters", void 0);

    _defineProperty(this, "boundsNear", void 0);

    _defineProperty(this, "boundsFar", void 0);

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
      outlineColor: [255, 255, 255]
    };
    this.boundsNear = 0.0;
    this.boundsFar = 100.0;
    this.gbufferPass = new GBufferPass(); // radius, threshold, falloff in view space coordinates.

    this.ssao1Pass = new SSAO1Pass(this.parameters.aoradius1, this.parameters.aothreshold1, this.parameters.aofalloff1);
    this.ssao2Pass = new SSAO1Pass(this.parameters.aoradius2, this.parameters.aothreshold2, this.parameters.aofalloff2);
    this.blur1Pass = new BlurPass(this.parameters.blurradius1);
    this.blur2Pass = new BlurPass(this.parameters.blurradius2);
    this.compositePass = new CompositePass({
      x: this.parameters.bghueoffset,
      y: this.parameters.bgchromaoffset,
      z: this.parameters.bgluminanceoffset
    });
    this.contourPass = new ContourPass();
    this.drawBufferPass = new DrawBufferPass(); // buffers:

    this.colorBuffer = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.colorBuffer.texture.generateMipmaps = false; // TODO : MRT AND SHARE DEPTH BUFFER among color, position, normal etc

    this.normalBuffer = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.normalBuffer.texture.generateMipmaps = false;
    this.positionBuffer = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.positionBuffer.texture.generateMipmaps = false; // intermediate blurring buffer

    this.blurIntermediateBuffer = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.blurIntermediateBuffer.texture.generateMipmaps = false;
    this.ssaoBuffer = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBuffer.texture.generateMipmaps = false;
    this.ssaoBuffer2 = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBuffer2.texture.generateMipmaps = false;
    this.ssaoBufferBlurred = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBufferBlurred.texture.generateMipmaps = false;
    this.ssaoBufferBlurred2 = new WebGLRenderTarget(2, 2, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBufferBlurred2.texture.generateMipmaps = false;
  }

  _createClass(MoleculeRenderer, [{
    key: "setupGui",
    value: function setupGui(gui) {
      var _this = this;

      var settings = this.parameters;
      gui.add(settings, "aoradius1", 0.01, 10.0).onChange(function (value) {
        _this.ssao1Pass.setRadius(value);
      });
      gui.add(settings, "blurradius1", 0.01, 10.0).onChange(function (value) {
        _this.blur1Pass.setRadius(value);
      });
      gui.add(settings, "aothreshold1", 0.01, 300.0);
      gui.add(settings, "aofalloff1", 0.01, 300.0);
      gui.add(settings, "aoradius2", 0.01, 10.0).onChange(function (value) {
        _this.ssao2Pass.setRadius(value);
      });
      gui.add(settings, "blurradius2", 0.01, 10.0).onChange(function (value) {
        _this.blur2Pass.setRadius(value);
      });
      gui.add(settings, "aothreshold2", 0.01, 300.0);
      gui.add(settings, "aofalloff2", 0.01, 300.0);
      gui.add(settings, "atomBeginDistance", 0.0, 300.0);
      gui.add(settings, "chainBeginDistance", 0.0, 300.0);
      gui.add(settings, "bghueoffset", 0.0, 1.0).onChange(function (value) {
        _this.compositePass.setBgHueOffset(value);
      });
      gui.add(settings, "bgchromaoffset", 0.0, 1.0).onChange(function (value) {
        _this.compositePass.setBgChromaOffset(value);
      });
      gui.add(settings, "bgluminanceoffset", 0.0, 1.0).onChange(function (value) {
        _this.compositePass.setBgLuminanceOffset(value);
      });
      gui.add(settings, "outlineThickness", 1.0, 8.0).step(1).onChange(function (value) {
        _this.contourPass.setOutlineThickness(value);
      });
      gui.addColor(settings, "outlineColor").onChange(function (value) {
        _this.contourPass.setOutlineColor(value);
      });
      gui.add(settings, "outlineAlpha", 0.0, 1.0).onChange(function (value) {
        _this.contourPass.setOutlineAlpha(value);
      });
      gui.add(settings, "followThickness", 1.0, 8.0).step(1).onChange(function (value) {
        _this.contourPass.setFollowOutlineThickness(value);
      });
      gui.addColor(settings, "followColor").onChange(function (value) {
        _this.contourPass.setFollowColor(value);
      });
      gui.add(settings, "followAlpha", 0.0, 1.0).onChange(function (value) {
        _this.contourPass.setFollowAlpha(value);
      });
    }
  }, {
    key: "setBackgroundColor",
    value: function setBackgroundColor(color) {
      this.compositePass.setBackgroundColor(color);
    }
  }, {
    key: "setFollowedInstance",
    value: function setFollowedInstance(instance) {
      this.compositePass.setFollowedInstance(instance);
      this.contourPass.setFollowedInstance(instance);
    }
  }, {
    key: "hitTest",
    value: function hitTest(renderer, x, y) {
      var pixel = new Float32Array(4).fill(-1); // (typeId), (instanceId), fragViewPos.z, fragPosDepth;

      renderer.readRenderTargetPixels(this.colorBuffer, x, y, 1, 1, pixel);

      if (pixel[3] === -1) {
        return -1;
      } else {
        // look up the object from its instance.
        var instance = pixel[1];
        return instance;
      }
    } // colorsData is a Float32Array of rgb triples

  }, {
    key: "updateColors",
    value: function updateColors(numColors, colorsData) {
      this.compositePass.updateColors(numColors, colorsData);
    }
  }, {
    key: "setMeshGroups",
    value: function setMeshGroups(agentMeshGroup, agentPDBGroup, agentFiberGroup, instancedMeshGroup) {
      this.gbufferPass.setMeshGroups(agentMeshGroup, agentPDBGroup, agentFiberGroup, instancedMeshGroup);
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      this.colorBuffer.setSize(x, y); // TODO : MRT AND SHARE DEPTH BUFFER

      this.normalBuffer.setSize(x, y);
      this.positionBuffer.setSize(x, y); // intermediate blurring buffer

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
  }, {
    key: "setNearFar",
    value: function setNearFar(n, f) {
      this.boundsNear = n;
      this.boundsFar = f;
    }
  }, {
    key: "render",
    value: function render(renderer, scene, camera, target) {
      // updates for transformed bounds (should this happen in shader?)
      this.ssao1Pass.pass.material.uniforms.ssaoThreshold.value = this.parameters.aothreshold1 + Math.max(this.boundsNear, 0.0);
      this.ssao1Pass.pass.material.uniforms.ssaoFalloff.value = this.parameters.aofalloff1 + Math.max(this.boundsNear, 0.0);
      this.ssao2Pass.pass.material.uniforms.ssaoThreshold.value = this.parameters.aothreshold2 + Math.max(this.boundsNear, 0.0);
      this.ssao2Pass.pass.material.uniforms.ssaoFalloff.value = this.parameters.aofalloff2 + Math.max(this.boundsNear, 0.0);
      this.compositePass.pass.material.uniforms.atomicBeginDistance.value = this.parameters.atomBeginDistance + Math.max(this.boundsNear, 0.0);
      this.compositePass.pass.material.uniforms.chainBeginDistance.value = this.parameters.chainBeginDistance + Math.max(this.boundsNear, 0.0); // currently rendering is a draw call per PDB POINTS objects and one draw call per mesh TRIANGLES object (reusing same geometry buffer)
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

      this.gbufferPass.render(renderer, scene, camera, this.colorBuffer, this.normalBuffer, this.positionBuffer); // 2 render ssao

      this.ssao1Pass.render(renderer, camera, this.ssaoBuffer, this.normalBuffer, this.positionBuffer);
      this.blur1Pass.render(renderer, this.ssaoBufferBlurred, this.ssaoBuffer, this.positionBuffer, this.blurIntermediateBuffer);
      this.ssao2Pass.render(renderer, camera, this.ssaoBuffer2, this.normalBuffer, this.positionBuffer);
      this.blur2Pass.render(renderer, this.ssaoBufferBlurred2, this.ssaoBuffer2, this.positionBuffer, this.blurIntermediateBuffer); // render composite pass into this buffer, overwriting whatever was there!
      // Be sure this buffer is not needed anymore!

      var compositeTarget = this.blurIntermediateBuffer; // render into default render target

      this.compositePass.render(renderer, camera, compositeTarget, this.ssaoBufferBlurred, this.ssaoBufferBlurred2, this.colorBuffer);
      this.contourPass.render(renderer, target, compositeTarget, // this is the buffer with the instance ids and fragdepth!
      this.colorBuffer, this.normalBuffer); // DEBUGGING some of the intermediate buffers:
      //this.drawBufferPass.setScale(1.0 / 34.0, 1.0 / 6.0, 0, 1);
      //this.drawBufferPass.render(renderer, target, this.colorBuffer);
      //this.drawBufferPass.render(renderer, target, this.ssaoBuffer);
      //this.drawBufferPass.render(renderer, target, this.ssaoBuffer2);
      //this.drawBufferPass.render(renderer, target, this.normalBuffer);
      //this.drawBufferPass.setScale(1.0/150.0, 1.0/150.0, 1.0/150.0, 1.0/150.0);
      //this.drawBufferPass.render(renderer, target, this.positionBuffer);
    }
  }]);

  return MoleculeRenderer;
}();

export default MoleculeRenderer;