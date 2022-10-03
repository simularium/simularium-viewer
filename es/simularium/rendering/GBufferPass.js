function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import MeshGBufferShaders from "./MeshGBufferShaders";
import PDBGBufferShaders from "./PDBGBufferShaders";
import InstanceMeshShaders from "./InstancedFiberEndcapShader";
import { Color, Group, Vector2, Scene } from "three"; // strategy:
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
  function GBufferPass() {
    _classCallCheck(this, GBufferPass);

    _defineProperty(this, "colorMaterialMesh", void 0);

    _defineProperty(this, "normalMaterialMesh", void 0);

    _defineProperty(this, "positionMaterialMesh", void 0);

    _defineProperty(this, "colorMaterialPDB", void 0);

    _defineProperty(this, "normalMaterialPDB", void 0);

    _defineProperty(this, "positionMaterialPDB", void 0);

    _defineProperty(this, "colorMaterialInstancedMesh", void 0);

    _defineProperty(this, "normalMaterialInstancedMesh", void 0);

    _defineProperty(this, "positionMaterialInstancedMesh", void 0);

    _defineProperty(this, "scene", void 0);

    _defineProperty(this, "agentMeshGroup", void 0);

    _defineProperty(this, "agentPDBGroup", void 0);

    _defineProperty(this, "agentFiberGroup", void 0);

    _defineProperty(this, "instancedMeshGroup", void 0);

    this.agentMeshGroup = new Group();
    this.agentPDBGroup = new Group();
    this.agentFiberGroup = new Group();
    this.instancedMeshGroup = new Group();
    this.colorMaterialMesh = MeshGBufferShaders.colorMaterial;
    this.normalMaterialMesh = MeshGBufferShaders.normalMaterial;
    this.positionMaterialMesh = MeshGBufferShaders.positionMaterial;
    this.colorMaterialPDB = PDBGBufferShaders.colorMaterial;
    this.normalMaterialPDB = PDBGBufferShaders.normalMaterial;
    this.positionMaterialPDB = PDBGBufferShaders.positionMaterial;
    this.colorMaterialInstancedMesh = InstanceMeshShaders.colorMaterial;
    this.normalMaterialInstancedMesh = InstanceMeshShaders.normalMaterial;
    this.positionMaterialInstancedMesh = InstanceMeshShaders.positionMaterial;
    this.scene = new Scene();
  }

  _createClass(GBufferPass, [{
    key: "setMeshGroups",
    value: function setMeshGroups(agentMeshGroup, agentPDBGroup, agentFiberGroup, instancedMeshGroup) {
      this.agentMeshGroup = agentMeshGroup;
      this.agentPDBGroup = agentPDBGroup;
      this.agentFiberGroup = agentFiberGroup;
      this.instancedMeshGroup = instancedMeshGroup;
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      this.colorMaterialPDB.uniforms.iResolution.value = new Vector2(width, height);
      this.normalMaterialPDB.uniforms.iResolution.value = new Vector2(width, height);
      this.positionMaterialPDB.uniforms.iResolution.value = new Vector2(width, height);
    }
  }, {
    key: "render",
    value: function render(renderer, scene, camera, colorBuffer, normalBuffer, positionBuffer) {
      var c = renderer.getClearColor().clone();
      var a = renderer.getClearAlpha();
      this.colorMaterialMesh.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.normalMaterialMesh.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.positionMaterialMesh.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.colorMaterialPDB.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.normalMaterialPDB.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.positionMaterialPDB.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.colorMaterialInstancedMesh.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.normalMaterialInstancedMesh.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.positionMaterialInstancedMesh.uniforms.projectionMatrix.value = camera.projectionMatrix; // 1. fill colorbuffer
      // clear color:
      // x:0 agent type id (0 so that type ids can be positive or negative integers)
      // y:-1 agent instance id (-1 so that 0 remains a distinct instance id from the background)
      // z:0 view space depth
      // alpha == -1 is a marker to discard pixels later, will be filled with frag depth

      renderer.setClearColor(new Color(0.0, -1.0, 0.0), -1.0);
      renderer.setRenderTarget(colorBuffer); // begin draw meshes

      this.agentMeshGroup.visible = true;
      this.agentFiberGroup.visible = true;
      this.agentPDBGroup.visible = false;
      this.instancedMeshGroup.visible = false;
      scene.overrideMaterial = this.colorMaterialMesh;
      renderer.render(scene, camera); // end draw meshes

      renderer.autoClear = false; // draw instanced things

      this.agentMeshGroup.visible = false;
      this.agentFiberGroup.visible = false;
      this.agentPDBGroup.visible = false;
      this.instancedMeshGroup.visible = true;
      scene.overrideMaterial = this.colorMaterialInstancedMesh;
      renderer.render(scene, camera); // end draw instanced things
      // begin draw pdb

      this.agentMeshGroup.visible = false;
      this.agentFiberGroup.visible = false;
      this.agentPDBGroup.visible = true;
      this.instancedMeshGroup.visible = false;
      scene.overrideMaterial = this.colorMaterialPDB;
      renderer.render(scene, camera); //end draw pdb

      renderer.autoClear = true; // 2. fill normalbuffer

      renderer.setClearColor(new Color(0.0, 0.0, 0.0), -1.0);
      renderer.setRenderTarget(normalBuffer);
      this.agentMeshGroup.visible = true;
      this.agentFiberGroup.visible = true;
      this.agentPDBGroup.visible = false;
      this.instancedMeshGroup.visible = false;
      scene.overrideMaterial = this.normalMaterialMesh;
      renderer.render(scene, camera);
      renderer.autoClear = false; // draw instanced things

      this.agentMeshGroup.visible = false;
      this.agentFiberGroup.visible = false;
      this.agentPDBGroup.visible = false;
      this.instancedMeshGroup.visible = true;
      scene.overrideMaterial = this.normalMaterialInstancedMesh;
      renderer.render(scene, camera); // end draw instanced things

      this.agentMeshGroup.visible = false;
      this.agentFiberGroup.visible = false;
      this.agentPDBGroup.visible = true;
      this.instancedMeshGroup.visible = false;
      scene.overrideMaterial = this.normalMaterialPDB;
      renderer.render(scene, camera);
      renderer.autoClear = true; // 3. fill positionbuffer

      renderer.setClearColor(new Color(0.0, 0.0, 0.0), -1.0);
      renderer.setRenderTarget(positionBuffer);
      this.agentMeshGroup.visible = true;
      this.agentFiberGroup.visible = true;
      this.agentPDBGroup.visible = false;
      this.instancedMeshGroup.visible = false;
      scene.overrideMaterial = this.positionMaterialMesh;
      renderer.render(scene, camera);
      renderer.autoClear = false; // draw instanced things

      this.agentMeshGroup.visible = false;
      this.agentFiberGroup.visible = false;
      this.agentPDBGroup.visible = false;
      this.instancedMeshGroup.visible = true;
      scene.overrideMaterial = this.positionMaterialInstancedMesh;
      renderer.render(scene, camera); // end draw instanced things

      this.agentMeshGroup.visible = false;
      this.agentFiberGroup.visible = false;
      this.agentPDBGroup.visible = true;
      this.instancedMeshGroup.visible = false;
      scene.overrideMaterial = this.positionMaterialPDB;
      renderer.render(scene, camera); // restore state before returning

      scene.overrideMaterial = null;
      renderer.autoClear = true; // restore saved clear color

      renderer.setClearColor(c, a);
    }
  }]);

  return GBufferPass;
}();

export default GBufferPass;