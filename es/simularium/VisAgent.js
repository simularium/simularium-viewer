function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import { CatmullRomCurve3, Color, Group, LineCurve3, Mesh, MeshBasicMaterial, MeshLambertMaterial, SphereBufferGeometry, TubeBufferGeometry, Vector2, Vector3 } from "three";
import MembraneShader from "./rendering/MembraneShader";
import VisTypes from "./VisTypes";
import { USE_INSTANCE_ENDCAPS } from "./VisTypes";

function getHighlightColor(color) {
  var hiColor = new Color(color);
  var hsl = {
    h: 0,
    s: 0,
    l: 0
  };
  hsl = hiColor.getHSL(hsl); // increase luminance 80% of the difference toward max

  hiColor.setHSL(hsl.h, hsl.s, hsl.l + 0.8 * (1.0 - hsl.l));
  return hiColor;
}

var NO_AGENT = -1;

var VisAgent = /*#__PURE__*/function () {
  _createClass(VisAgent, null, [{
    key: "updateMembrane",
    // this material only used in webGL1 fallback rendering mode
    value: function updateMembrane(time, renderer) {
      VisAgent.membraneData.facesMaterial.uniforms.iTime.value = time;
      VisAgent.membraneData.sidesMaterial.uniforms.iTime.value = time;
      renderer.getDrawingBufferSize(VisAgent.membraneData.facesMaterial.uniforms.iResolution.value);
      renderer.getDrawingBufferSize(VisAgent.membraneData.sidesMaterial.uniforms.iResolution.value);
    }
  }]);

  function VisAgent(name) {
    _classCallCheck(this, VisAgent);

    _defineProperty(this, "mesh", void 0);

    _defineProperty(this, "fiberCurve", void 0);

    _defineProperty(this, "pdbModel", void 0);

    _defineProperty(this, "pdbObjects", void 0);

    _defineProperty(this, "lod", void 0);

    _defineProperty(this, "typeId", void 0);

    _defineProperty(this, "colorIndex", void 0);

    _defineProperty(this, "active", void 0);

    _defineProperty(this, "baseMaterial", void 0);

    _defineProperty(this, "highlightMaterial", void 0);

    _defineProperty(this, "color", void 0);

    _defineProperty(this, "name", void 0);

    _defineProperty(this, "followed", void 0);

    _defineProperty(this, "highlighted", void 0);

    _defineProperty(this, "hidden", void 0);

    _defineProperty(this, "visType", void 0);

    _defineProperty(this, "id", void 0);

    this.id = NO_AGENT;
    this.visType = VisTypes.ID_VIS_TYPE_DEFAULT;
    this.name = name;
    this.color = new Color(VisAgent.UNASSIGNED_MESH_COLOR);
    this.active = false;
    this.typeId = -1;
    this.colorIndex = 0;
    this.followed = false;
    this.hidden = false;
    this.highlighted = false;
    this.baseMaterial = new MeshLambertMaterial({
      color: new Color(this.color)
    });
    this.highlightMaterial = new MeshBasicMaterial({
      color: getHighlightColor(this.color),
      transparent: true,
      opacity: 1.0
    });
    this.mesh = new Mesh(VisAgent.sphereGeometry, this.baseMaterial);
    this.mesh.userData = {
      id: this.id
    };
    this.mesh.visible = false;
    this.fiberCurve = undefined;
    this.pdbModel = undefined;
    this.pdbObjects = [];
    this.lod = 0;
  }

  _createClass(VisAgent, [{
    key: "resetMesh",
    value: function resetMesh() {
      this.id = NO_AGENT;
      this.visType = VisTypes.ID_VIS_TYPE_DEFAULT;
      this.typeId = -1;
      this.mesh = new Mesh(VisAgent.sphereGeometry, this.baseMaterial);
      this.mesh.userData = {
        id: this.id
      };
      this.followed = false;
      this.highlighted = false;
      this.setColor(new Color(VisAgent.UNASSIGNED_MESH_COLOR), 0);
    }
  }, {
    key: "resetPDB",
    value: function resetPDB() {
      this.pdbModel = undefined;
      this.pdbObjects = [];
      this.lod = 0;
    }
  }, {
    key: "setColor",
    value: function setColor(color, colorIndex) {
      this.color = color;
      this.colorIndex = colorIndex;
      this.baseMaterial = new MeshLambertMaterial({
        color: new Color(this.color)
      });
      this.highlightMaterial = new MeshBasicMaterial({
        color: getHighlightColor(this.color),
        transparent: true,
        opacity: 1.0
      }); // because this is a new material, we need to re-install it on the geometry
      // TODO deal with highlight and selection state

      this.assignMaterial();
    }
  }, {
    key: "setHidden",
    value: function setHidden(hidden) {
      this.hidden = hidden;
    }
  }, {
    key: "setFollowed",
    value: function setFollowed(followed) {
      this.followed = followed;
      this.assignMaterial();
    }
  }, {
    key: "setHighlighted",
    value: function setHighlighted(highlighted) {
      if (highlighted !== this.highlighted) {
        this.highlighted = highlighted;
        this.assignMaterial();
      }
    }
  }, {
    key: "assignMaterial",
    value: function assignMaterial() {
      var _this = this;

      if (this.mesh.name.includes("membrane")) {
        return this.assignMembraneMaterial();
      }

      var material = this.baseMaterial;

      if (this.followed) {
        material = VisAgent.followMaterial;
      } else if (this.highlighted) {
        material = this.highlightMaterial;
      }

      for (var i = 0; i < this.pdbObjects.length; ++i) {
        this.pdbObjects[i].onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
      }

      if (this.mesh instanceof Mesh) {
        this.mesh.material = material;
        this.mesh.onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
      } else {
        this.mesh.traverse(function (child) {
          if (child instanceof Mesh) {
            child.material = material;
            child.onBeforeRender = _this.onAgentMeshBeforeRender.bind(_this);
          }
        });
      }
    }
  }, {
    key: "assignMembraneMaterial",
    value: function assignMembraneMaterial() {
      var _this2 = this;

      if (this.highlighted) {
        // at this time, assign separate material parameters to the faces and sides of the membrane
        var faceNames = VisAgent.membraneData.faces.map(function (el) {
          return el.name;
        });
        var sideNames = VisAgent.membraneData.sides.map(function (el) {
          return el.name;
        });
        this.mesh.traverse(function (child) {
          if (child instanceof Mesh) {
            if (faceNames.includes(child.name)) {
              child.material = VisAgent.membraneData.facesMaterial;
              child.onBeforeRender = _this2.onAgentMeshBeforeRender.bind(_this2);
            } else if (sideNames.includes(child.name)) {
              child.material = VisAgent.membraneData.sidesMaterial;
              child.onBeforeRender = _this2.onAgentMeshBeforeRender.bind(_this2);
            }
          }
        });
        VisAgent.membraneData.facesMaterial.uniforms.uvscale.value = VisAgent.membraneData.facesUVScale;
        VisAgent.membraneData.sidesMaterial.uniforms.uvscale.value = VisAgent.membraneData.sidesUVScale;
      } else {
        this.mesh.traverse(function (child) {
          if (child instanceof Mesh) {
            child.material = _this2.baseMaterial;
            child.onBeforeRender = _this2.onAgentMeshBeforeRender.bind(_this2);
          }
        });
      }
    }
  }, {
    key: "signedTypeId",
    value: function signedTypeId() {
      // Note, adding 1 to colorIndex because it can be 0 and the signed multiplier won't do anything.
      // This means we have to subtract 1 in the downstream code (the shaders) if we need the true value.
      return (this.colorIndex + 1) * (this.highlighted ? 1 : -1);
    }
  }, {
    key: "onAgentMeshBeforeRender",
    value: function onAgentMeshBeforeRender(renderer, scene, camera, geometry, material
    /* group */
    ) {
      if (!material.uniforms) {
        return;
      } // colorIndex is not necessarily equal to typeId but is generally a 1-1 mapping.


      if (material.uniforms.typeId) {
        // negate the value if dehighlighted.
        // see implementation in CompositePass.ts for how the value is interpreted
        material.uniforms.typeId.value = this.signedTypeId();
        material.uniformsNeedUpdate = true;
      }

      if (material.uniforms.instanceId) {
        material.uniforms.instanceId.value = Number(this.id);
        material.uniformsNeedUpdate = true;
      }

      if (material.uniforms.radius) {
        material.uniforms.radius.value = (this.lod + 1) * 0.25; // * 8;

        material.uniformsNeedUpdate = true;
      }
    }
  }, {
    key: "setupMeshGeometry",
    value: function setupMeshGeometry(meshGeom) {
      // remember current transform
      var p = this.mesh.position;
      var r = this.mesh.rotation;
      var s = this.mesh.scale;
      var visible = this.mesh.visible;
      this.mesh = meshGeom.clone();
      this.mesh.userData = {
        id: this.id
      };
      this.mesh.visible = visible; // restore transform

      this.mesh.position.copy(p);
      this.mesh.rotation.copy(r);
      this.mesh.scale.copy(s);
      this.assignMaterial();
    }
  }, {
    key: "setupPdb",
    value: function setupPdb(pdb) {
      this.pdbModel = pdb;
      this.pdbObjects = pdb.instantiate();
      this.assignMaterial();
    }
  }, {
    key: "selectLOD",
    value: function selectLOD(index) {
      this.setPDBInvisible();

      if (index < 0 || index >= this.pdbObjects.length) {
        index = this.pdbObjects.length - 1;
      }

      this.lod = index;
      this.pdbObjects[index].visible = true;
    }
  }, {
    key: "setPDBInvisible",
    value: function setPDBInvisible() {
      for (var j = 0; j < this.pdbObjects.length; ++j) {
        this.pdbObjects[j].visible = false;
      }
    }
  }, {
    key: "renderAsMesh",
    value: function renderAsMesh() {
      this.setPDBInvisible();
      this.mesh.visible = true;
    }
  }, {
    key: "renderAsPDB",
    value: function renderAsPDB(myDistance, distanceStops, lodBias) {
      this.mesh.visible = false;

      for (var j = 0; j < distanceStops.length; ++j) {
        // the first distance less than.
        if (myDistance < distanceStops[j]) {
          this.selectLOD(j + lodBias);
          break;
        }
      }
    }
  }, {
    key: "hide",
    value: function hide() {
      this.mesh.visible = false;
      this.setPDBInvisible();
    }
  }, {
    key: "hideAndDeactivate",
    value: function hideAndDeactivate() {
      this.hide();
      this.active = false;
    }
  }, {
    key: "hasDrawablePDB",
    value: function hasDrawablePDB() {
      return this.pdbModel !== undefined && this.pdbModel.pdb !== null && this.pdbObjects.length > 0 && !this.pdbModel.name.startsWith(VisAgent.UNASSIGNED_NAME_PREFIX);
    }
  }, {
    key: "updateFiber",
    value: function updateFiber(subpoints, collisionRadius, scale) {
      // assume a known structure.
      // first child is fiber
      // second and third children are endcaps
      //if (this.mesh.children.length !== 3) {
      //    console.error("Bad mesh structure for fiber");
      //    return;
      // }
      // put all the subpoints into a Vector3[]
      var curvePoints = [];
      var numSubPoints = subpoints.length;
      var numPoints = numSubPoints / 3;

      if (numSubPoints % 3 !== 0) {
        console.warn("Warning, subpoints array does not contain a multiple of 3");
        return;
      }

      if (numPoints < 2) {
        console.warn("Warning, subpoints array does not have enough points for a curve");
        return;
      }

      for (var j = 0; j < numSubPoints; j += 3) {
        var x = subpoints[j];
        var y = subpoints[j + 1];
        var z = subpoints[j + 2];
        curvePoints.push(new Vector3(x, y, z));
      } // set up new fiber as curved tube


      this.fiberCurve = new CatmullRomCurve3(curvePoints);
      var fibergeometry = new TubeBufferGeometry(this.fiberCurve, 4 * (numPoints - 1), // 4 segments per control point
      collisionRadius * scale * 0.5, 8, // could reduce this with depth?
      false);
      this.mesh.children[0].geometry = fibergeometry;

      if (this.mesh.children.length === 3) {
        // update transform of endcap 0
        var runtimeFiberEncapMesh0 = this.mesh.children[1];
        runtimeFiberEncapMesh0.position.x = curvePoints[0].x;
        runtimeFiberEncapMesh0.position.y = curvePoints[0].y;
        runtimeFiberEncapMesh0.position.z = curvePoints[0].z;
        runtimeFiberEncapMesh0.scale.x = collisionRadius * scale * 0.5;
        runtimeFiberEncapMesh0.scale.y = collisionRadius * scale * 0.5;
        runtimeFiberEncapMesh0.scale.z = collisionRadius * scale * 0.5; // update transform of endcap 1

        var runtimeFiberEncapMesh1 = this.mesh.children[2];
        runtimeFiberEncapMesh1.position.x = curvePoints[curvePoints.length - 1].x;
        runtimeFiberEncapMesh1.position.y = curvePoints[curvePoints.length - 1].y;
        runtimeFiberEncapMesh1.position.z = curvePoints[curvePoints.length - 1].z;
        runtimeFiberEncapMesh1.scale.x = collisionRadius * scale * 0.5;
        runtimeFiberEncapMesh1.scale.y = collisionRadius * scale * 0.5;
        runtimeFiberEncapMesh1.scale.z = collisionRadius * scale * 0.5;
      }
    } // make a single generic fiber and return it

  }, {
    key: "getFollowPosition",
    value: function getFollowPosition() {
      if (this.visType === VisTypes.ID_VIS_TYPE_FIBER && this.fiberCurve) {
        return this.fiberCurve.getPoint(0.5);
      } else {
        return new Vector3().copy(this.mesh.position);
      }
    }
  }], [{
    key: "makeFiber",
    value: function makeFiber() {
      var fibercurve = new LineCurve3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
      var geometry = new TubeBufferGeometry(fibercurve, 1, 1, 1, false);
      var fiberMesh = new Mesh(geometry);
      fiberMesh.name = "Fiber";
      var fiberGroup = new Group();
      fiberGroup.add(fiberMesh);

      if (!USE_INSTANCE_ENDCAPS) {
        var fiberEndcapMesh0 = new Mesh(VisAgent.fiberEndcapGeometry);
        fiberEndcapMesh0.name = "FiberEnd0";
        var fiberEndcapMesh1 = new Mesh(VisAgent.fiberEndcapGeometry);
        fiberEndcapMesh1.name = "FiberEnd1";
        fiberGroup.add(fiberEndcapMesh0);
        fiberGroup.add(fiberEndcapMesh1);
      } // downstream code will switch this flag


      fiberGroup.visible = false;
      return fiberGroup;
    }
  }]);

  return VisAgent;
}();

_defineProperty(VisAgent, "UNASSIGNED_MESH_COLOR", 0xff00ff);

_defineProperty(VisAgent, "UNASSIGNED_NAME_PREFIX", "Unassigned");

_defineProperty(VisAgent, "sphereGeometry", new SphereBufferGeometry(1, 32, 32));

_defineProperty(VisAgent, "fiberEndcapGeometry", new SphereBufferGeometry(1, 8, 8));

_defineProperty(VisAgent, "followMaterial", new MeshBasicMaterial({
  color: new Color(0.14, 1, 0)
}));

_defineProperty(VisAgent, "membraneData", {
  faces: [{
    name: "curved_5nm_Right"
  }, {
    name: "curved_5nm_Left"
  }],
  sides: [{
    name: "curved_5nm_Bottom"
  }, {
    name: "curved_5nm_Top"
  }, {
    name: "curved_5nm_Back"
  }, {
    name: "curved_5nm_Front"
  }],
  facesMaterial: MembraneShader.membraneShader.clone(),
  sidesMaterial: MembraneShader.membraneShader.clone(),
  facesUVScale: new Vector2(40.0, 40.0),
  sidesUVScale: new Vector2(2.0, 40.0)
});

export { VisAgent as default };