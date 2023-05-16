import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Color, MeshLambertMaterial, MeshBasicMaterial, TubeBufferGeometry, Group, LOD, Mesh, PointsMaterial, Raycaster } from "three";
var FOLLOW_COLOR = new Color(0xffff00);
var HIGHLIGHT_COLOR = new Color(0xffffff);

// data and functions for rendering in the low fidelity webgl1 mode
var LegacyRenderer = /*#__PURE__*/function () {
  function LegacyRenderer() {
    _classCallCheck(this, LegacyRenderer);
    _defineProperty(this, "baseMaterial", void 0);
    _defineProperty(this, "highlightMaterial", void 0);
    _defineProperty(this, "followMaterial", void 0);
    _defineProperty(this, "agentMeshGroup", void 0);
    this.baseMaterial = new MeshLambertMaterial({
      color: new Color(0xff00ff)
    });
    this.highlightMaterial = new MeshBasicMaterial({
      color: new Color(HIGHLIGHT_COLOR),
      transparent: true,
      opacity: 0.6
    });
    this.followMaterial = new MeshBasicMaterial({
      color: new Color(FOLLOW_COLOR)
    });
    this.agentMeshGroup = new Group();
  }
  _createClass(LegacyRenderer, [{
    key: "beginUpdate",
    value: function beginUpdate(scene) {
      scene.remove(this.agentMeshGroup);
      // drop the old group as a cheap code way of removing all children.
      this.agentMeshGroup = new Group();
      this.agentMeshGroup.name = "legacy mesh group";
    }
  }, {
    key: "addFiber",
    value: function addFiber(visAgent, scale, color) {
      if (!visAgent.fiberCurve) {
        console.warn("no curve provided");
        return;
      }
      // expensive
      var fibergeometry = new TubeBufferGeometry(visAgent.fiberCurve, 4 * (visAgent.fiberCurve.points.length - 1),
      // 4 segments per control point
      scale * 0.5, 8,
      // could reduce this with depth?
      false);
      var m = new Mesh(fibergeometry, this.selectMaterial(visAgent, color));
      m.userData = {
        id: visAgent.agentData.instanceId
      };
      this.agentMeshGroup.add(m);
    }
  }, {
    key: "selectMaterial",
    value: function selectMaterial(visAgent, color) {
      if (visAgent.followed) {
        return this.followMaterial;
      } else if (visAgent.highlighted) {
        return this.highlightMaterial;
      } else {
        var material = this.baseMaterial.clone();
        material.color = color;
        return material;
      }
    }
  }, {
    key: "selectColor",
    value: function selectColor(visAgent, color) {
      if (visAgent.followed) {
        return FOLLOW_COLOR;
      } else if (visAgent.highlighted) {
        return HIGHLIGHT_COLOR;
      } else {
        return color;
      }
    }
  }, {
    key: "addMesh",
    value: function addMesh(meshGeom, visAgent, scale, color) {
      var m = new Mesh(meshGeom, this.selectMaterial(visAgent, color));
      m.position.x = visAgent.agentData.x;
      m.position.y = visAgent.agentData.y;
      m.position.z = visAgent.agentData.z;
      m.rotation.x = visAgent.agentData.xrot;
      m.rotation.y = visAgent.agentData.yrot;
      m.rotation.z = visAgent.agentData.zrot;
      m.scale.x = scale;
      m.scale.y = scale;
      m.scale.z = scale;
      m.userData = {
        id: visAgent.agentData.instanceId
      };

      // resolve material?
      this.agentMeshGroup.add(m);
    }
  }, {
    key: "addPdb",
    value: function addPdb(pdb, visAgent, color, distances) {
      var pdbGroup = new LOD();
      var pdbObjects = pdb.instantiate();
      // update pdb transforms too
      for (var lod = pdbObjects.length - 1; lod >= 0; --lod) {
        var obj = pdbObjects[lod];
        obj.userData = {
          id: visAgent.agentData.instanceId
        };
        // LOD to be selected at render time, not update time
        obj.material = new PointsMaterial({
          color: this.selectColor(visAgent, color)
        });
        pdbGroup.addLevel(obj, distances[lod]);
      }
      pdbGroup.position.x = visAgent.agentData.x;
      pdbGroup.position.y = visAgent.agentData.y;
      pdbGroup.position.z = visAgent.agentData.z;
      pdbGroup.rotation.x = visAgent.agentData.xrot;
      pdbGroup.rotation.y = visAgent.agentData.yrot;
      pdbGroup.rotation.z = visAgent.agentData.zrot;
      pdbGroup.scale.x = 1.0;
      pdbGroup.scale.y = 1.0;
      pdbGroup.scale.z = 1.0;
      pdbGroup.userData = {
        id: visAgent.agentData.instanceId
      };
      this.agentMeshGroup.add(pdbGroup);
    }
  }, {
    key: "endUpdate",
    value: function endUpdate(scene) {
      if (this.agentMeshGroup.children.length > 0) {
        scene.add(this.agentMeshGroup);
      }
    }
  }, {
    key: "hitTest",
    value: function hitTest(coords, camera) {
      var raycaster = new Raycaster();
      raycaster.setFromCamera(coords, camera);
      // intersect the agent mesh group.
      var intersects = raycaster.intersectObjects(this.agentMeshGroup.children, true);
      intersects.sort(function (a, b) {
        return a.distance - b.distance;
      });
      if (intersects && intersects.length) {
        var obj = intersects[0].object;
        // if the object has a parent and the parent is not the scene, use that.
        // assumption: obj file meshes or fibers load into their own Groups
        // and have only one level of hierarchy.
        if (!obj.userData || !obj.userData.id) {
          if (obj.parent && obj.parent !== this.agentMeshGroup) {
            obj = obj.parent;
          }
        }
        return obj.userData.id;
      } else {
        var NO_AGENT = -1;
        return NO_AGENT;
      }
    }
  }]);
  return LegacyRenderer;
}();
export { LegacyRenderer };