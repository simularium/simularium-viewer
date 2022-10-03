"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _SSAO = _interopRequireDefault(require("./SSAO"));

var _MoleculePass = _interopRequireDefault(require("./MoleculePass"));

var _GaussianBlur = _interopRequireDefault(require("./GaussianBlur"));

var _CompositePass = _interopRequireDefault(require("./CompositePass"));

var _ContourPass = _interopRequireDefault(require("./ContourPass"));

var _DrawBufferPass = _interopRequireDefault(require("./DrawBufferPass"));

var _three = require("three");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var MoleculeRenderer =
/*#__PURE__*/
function () {
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

    this.gbufferPass = new _MoleculePass.default(1); // radius, threshold, falloff in view space coordinates.

    this.ssao1Pass = new _SSAO.default(4.5, 150, 150);
    this.ssao2Pass = new _SSAO.default(4.5, 150, 150); //        this.ssao1Pass = new SSAO1Pass(0.00005, 0.38505, 0.08333);
    //        this.ssao2Pass = new SSAO1Pass(0.00125, 1.05714, 0.15188);

    this.blur1Pass = new _GaussianBlur.default(10);
    this.blur2Pass = new _GaussianBlur.default(10);
    this.compositePass = new _CompositePass.default();
    this.contourPass = new _ContourPass.default();
    this.drawBufferPass = new _DrawBufferPass.default(); // buffers:

    this.colorBuffer = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.colorBuffer.texture.generateMipmaps = false; // TODO : MRT AND SHARE DEPTH BUFFER among color, position, normal etc

    this.normalBuffer = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.normalBuffer.texture.generateMipmaps = false;
    this.positionBuffer = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.positionBuffer.texture.generateMipmaps = false; // intermediate blurring buffer

    this.blurIntermediateBuffer = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.blurIntermediateBuffer.texture.generateMipmaps = false;
    this.ssaoBuffer = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBuffer.texture.generateMipmaps = false;
    this.ssaoBuffer2 = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBuffer2.texture.generateMipmaps = false;
    this.ssaoBufferBlurred = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBufferBlurred.texture.generateMipmaps = false;
    this.ssaoBufferBlurred2 = new _three.WebGLRenderTarget(2, 2, {
      minFilter: _three.NearestFilter,
      magFilter: _three.NearestFilter,
      format: _three.RGBAFormat,
      type: _three.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.ssaoBufferBlurred2.texture.generateMipmaps = false;
  }

  _createClass(MoleculeRenderer, [{
    key: "setupGui",
    value: function setupGui(gui) {
      var settings = {
        atomRadius: 1.0,
        aoradius1: 4.5,
        aoradius2: 4.5,
        blurradius1: 10.0,
        blurradius2: 10.0,
        aothreshold1: 150,
        aofalloff1: 150,
        aothreshold2: 150,
        aofalloff2: 150,
        atomBeginDistance: 150.0,
        chainBeginDistance: 225.0
      };
      var self = this;
      gui.add(settings, "atomRadius", 0.01, 10.0).onChange(function (value) {
        self.gbufferPass.setAtomRadius(value);
      });
      gui.add(settings, "aoradius1", 0.01, 10.0).onChange(function (value) {
        self.ssao1Pass.pass.material.uniforms.radius.value = value;
      });
      gui.add(settings, "blurradius1", 0.01, 10.0).onChange(function (value) {
        self.blur1Pass.setRadius(value);
      });
      gui.add(settings, "aothreshold1", 0.01, 300.0).onChange(function (value) {
        self.ssao1Pass.pass.material.uniforms.ssao_threshold.value = value;
      });
      gui.add(settings, "aofalloff1", 0.01, 300.0).onChange(function (value) {
        self.ssao1Pass.pass.material.uniforms.ssao_falloff.value = value;
      });
      gui.add(settings, "aoradius2", 0.01, 10.0).onChange(function (value) {
        self.ssao2Pass.pass.material.uniforms.radius.value = value;
      });
      gui.add(settings, "blurradius2", 0.01, 10.0).onChange(function (value) {
        self.blur2Pass.setRadius(value);
      });
      gui.add(settings, "aothreshold2", 0.01, 300.0).onChange(function (value) {
        self.ssao2Pass.pass.material.uniforms.ssao_threshold.value = value;
      });
      gui.add(settings, "aofalloff2", 0.01, 300.0).onChange(function (value) {
        self.ssao2Pass.pass.material.uniforms.ssao_falloff.value = value;
      });
      gui.add(settings, "atomBeginDistance", 0.0, 300.0).onChange(function (value) {
        self.compositePass.pass.material.uniforms.atomicBeginDistance.value = value;
      });
      gui.add(settings, "chainBeginDistance", 0.0, 300.0).onChange(function (value) {
        self.compositePass.pass.material.uniforms.chainBeginDistance.value = value;
      });
    }
  }, {
    key: "setBackgroundColor",
    value: function setBackgroundColor(color) {
      this.compositePass.pass.material.uniforms.backgroundColor.value = color;
    }
  }, {
    key: "setHighlightInstance",
    value: function setHighlightInstance(instance) {
      this.compositePass.pass.material.uniforms.highlightInstance.value = instance;
    }
  }, {
    key: "hitTest",
    value: function hitTest(renderer, x, y) {
      var pixel = new Float32Array(4).fill(-1); // (IN_typeId), (IN_instanceId), fragViewPos.z, fragPosDepth;

      renderer.readRenderTargetPixels(this.colorBuffer, x, y, 1, 1, pixel);

      if (pixel[3] === -1) {
        return -1;
      } else {
        // look up the object from its instance.
        var instance = pixel[1];
        return instance;
      }
    } // TODO this is a geometry/scene update and should be updated through some other means?

  }, {
    key: "updateMolecules",
    value: function updateMolecules(positions, typeids, instanceids, numAgents, numAtomsPerAgent) {
      this.gbufferPass.update(positions, typeids, instanceids, numAgents * numAtomsPerAgent);
    } // colorsData is a Float32Array of rgb triples

  }, {
    key: "updateColors",
    value: function updateColors(numColors, colorsData) {
      this.compositePass.updateColors(numColors, colorsData);
    }
  }, {
    key: "createMoleculeBuffer",
    value: function createMoleculeBuffer(n) {
      this.gbufferPass.createMoleculeBuffer(n);
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
    key: "render",
    value: function render(renderer, camera, target) {
      // TODO : DEPTH HANDLING STRATEGY:
      // gbuffer pass writes gl_FragDepth
      // depth buffer should be not written to or tested again after this.
      // depth buffer should be maintained and transferred to final render pass so that other standard geometry can be drawn
      // 1 draw molecules into G buffers
      // TODO : MRT
      this.gbufferPass.render(renderer, camera, this.colorBuffer, this.normalBuffer, this.positionBuffer); // 2 render ssao

      this.ssao1Pass.render(renderer, camera, this.ssaoBuffer, this.normalBuffer, this.positionBuffer);
      this.blur1Pass.render(renderer, this.ssaoBufferBlurred, this.ssaoBuffer, this.positionBuffer, this.blurIntermediateBuffer);
      this.ssao2Pass.render(renderer, camera, this.ssaoBuffer2, this.normalBuffer, this.positionBuffer);
      this.blur2Pass.render(renderer, this.ssaoBufferBlurred2, this.ssaoBuffer2, this.positionBuffer, this.blurIntermediateBuffer); // render composite pass into normal buffer, overwriting the normals data!

      var compositeTarget = this.normalBuffer; // render into default render target

      this.compositePass.render(renderer, camera, compositeTarget, this.ssaoBufferBlurred, this.ssaoBufferBlurred2, this.colorBuffer);
      this.contourPass.render(renderer, target, compositeTarget, // this is the buffer with the instance ids and fragdepth!
      this.colorBuffer); //this.drawBufferPass.render(renderer, target, this.colorBuffer);
      //this.drawBufferPass.render(renderer, target, this.ssaoBuffer);
      //this.drawBufferPass.render(renderer, target, this.ssaoBuffer2);
      //this.drawBufferPass.render(renderer, target, this.normalBuffer);
      //this.drawBufferPass.setScale(1.0/150.0, 1.0/150.0, 1.0/150.0, 1.0/150.0);
      //this.drawBufferPass.render(renderer, target, this.positionBuffer);
    }
  }]);

  return MoleculeRenderer;
}();

var _default = MoleculeRenderer;
exports.default = _default;