"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _PDBGBufferShaders = _interopRequireDefault(require("./PDBGBufferShaders"));

var _InstancedFiber = require("./InstancedFiber");

var _MultipassMaterials = require("./MultipassMaterials");

var _three = require("three");

// strategy:
// 0. based on depth, aggregate atoms in the molecule into larger spheres using clustering ?
// 1. write spheres as GL_POINTs with appropriately scaled size
// 2. fragment shader: discard pts outside of sphere,
//    write normal
//    write depth
//    write color
//    write instance id (for same molecule...)
// 3. AO shader + blend over color buffer
// 4. outline shader over color buffer
//
// draw positions, normals, and instance and type ids of objects
var GBufferPass = /*#__PURE__*/function () {
  // instancedMeshGroup consists of fibers and meshes:
  function GBufferPass() {
    (0, _classCallCheck2["default"])(this, GBufferPass);
    (0, _defineProperty2["default"])(this, "pdbGbufferMaterials", void 0);
    (0, _defineProperty2["default"])(this, "scene", void 0);
    (0, _defineProperty2["default"])(this, "instancedMeshGroup", void 0);
    (0, _defineProperty2["default"])(this, "fibers", void 0);
    (0, _defineProperty2["default"])(this, "meshTypes", void 0);
    this.instancedMeshGroup = new _three.Group();
    this.fibers = new _InstancedFiber.InstancedFiberGroup();
    this.meshTypes = [];
    this.pdbGbufferMaterials = _PDBGBufferShaders["default"].shaderSet;
    this.scene = new _three.Scene();
  }

  (0, _createClass2["default"])(GBufferPass, [{
    key: "setMeshGroups",
    value: function setMeshGroups(instancedMeshGroup, fibers, meshes) {
      this.instancedMeshGroup = instancedMeshGroup;
      this.fibers = fibers;
      this.meshTypes = meshes;
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      (0, _MultipassMaterials.updateResolution)(this.pdbGbufferMaterials, width, height);
    }
  }, {
    key: "render",
    value: function render(renderer, scene, camera, gbuffer) {
      var c = renderer.getClearColor(new _three.Color()).clone();
      var a = renderer.getClearAlpha(); // TODO necessary??  now handled in the meshTypes loop below

      (0, _MultipassMaterials.updateProjectionMatrix)(this.pdbGbufferMaterials, camera.projectionMatrix);
      this.fibers.updateProjectionMatrix(camera.projectionMatrix);

      for (var i = 0; i < this.meshTypes.length; ++i) {
        var s = this.meshTypes[i].getShaders();
        (0, _MultipassMaterials.updateProjectionMatrix)(s, camera.projectionMatrix);
      } // clear color:
      // x:0 agent type id (0 so that type ids can be positive or negative integers)
      // y:-1 agent instance id (-1 so that 0 remains a distinct instance id from the background)
      // z:0 view space depth
      // alpha == -1 is a marker to discard pixels later, will be filled with frag depth
      // note that current multiple render target implementation does not allow for separate clear values


      var COLOR_CLEAR = new _three.Color(0.0, -1.0, 0.0);
      var COLOR_ALPHA = -1.0;
      renderer.setClearColor(COLOR_CLEAR, COLOR_ALPHA);
      renderer.setRenderTarget(gbuffer);
      renderer.clear();
      renderer.autoClear = false; // everybody (pdb, mesh, and fiber) is instanced now

      var DO_INSTANCED = true;

      if (DO_INSTANCED) {
        // draw instanced things
        this.instancedMeshGroup.visible = true;
        this.fibers.setRenderPass();

        for (var _i = 0; _i < this.meshTypes.length; ++_i) {
          (0, _MultipassMaterials.setRenderPass)(this.meshTypes[_i].getMesh(), this.meshTypes[_i].getShaders());
        }

        renderer.render(scene, camera); // end draw instanced things

        renderer.autoClear = false;
        scene.overrideMaterial = null;
      } // restore state before returning


      scene.overrideMaterial = null;
      renderer.autoClear = true; // restore saved clear color

      renderer.setClearColor(c, a);
    }
  }]);
  return GBufferPass;
}();

var _default = GBufferPass;
exports["default"] = _default;