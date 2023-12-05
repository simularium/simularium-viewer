import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { CatmullRomCurve3, Color, Vector3 } from "three";
import VisTypes from "../simularium/VisTypes";
var NO_AGENT = -1;
var VisAgent = /*#__PURE__*/function () {
  function VisAgent(name) {
    _classCallCheck(this, VisAgent);
    _defineProperty(this, "agentData", void 0);
    _defineProperty(this, "fiberCurve", void 0);
    _defineProperty(this, "colorIndex", void 0);
    _defineProperty(this, "active", void 0);
    _defineProperty(this, "color", void 0);
    _defineProperty(this, "name", void 0);
    _defineProperty(this, "followed", void 0);
    _defineProperty(this, "highlighted", void 0);
    _defineProperty(this, "hidden", void 0);
    this.agentData = {
      x: 0,
      y: 0,
      z: 0,
      xrot: 0,
      yrot: 0,
      zrot: 0,
      instanceId: NO_AGENT,
      "vis-type": VisTypes.ID_VIS_TYPE_DEFAULT,
      type: 0,
      cr: 1.0,
      subpoints: []
    };
    this.name = name;
    this.color = new Color(VisAgent.UNASSIGNED_MESH_COLOR);
    this.active = false;
    this.colorIndex = 0;
    this.followed = false;
    this.hidden = false;
    this.highlighted = false;
    this.fiberCurve = undefined;
  }
  _createClass(VisAgent, [{
    key: "resetMesh",
    value: function resetMesh() {
      this.followed = false;
      this.highlighted = false;
      this.setColor({
        color: new Color(VisAgent.UNASSIGNED_MESH_COLOR),
        colorId: 0
      });
      this.agentData = {
        x: 0,
        y: 0,
        z: 0,
        xrot: 0,
        yrot: 0,
        zrot: 0,
        instanceId: NO_AGENT,
        "vis-type": VisTypes.ID_VIS_TYPE_DEFAULT,
        type: 0,
        cr: 1.0,
        subpoints: []
      };
    }
  }, {
    key: "setColor",
    value: function setColor(colorInfo) {
      this.color = colorInfo.color;
      this.colorIndex = colorInfo.colorId;
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
    }
  }, {
    key: "setHighlighted",
    value: function setHighlighted(highlighted) {
      if (highlighted !== this.highlighted) {
        this.highlighted = highlighted;
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
    key: "onPdbBeforeRender",
    value: function onPdbBeforeRender(renderer, scene, camera, geometry, material
    /* group */) {
      if (!material.uniforms) {
        return;
      }
      // colorIndex is not necessarily equal to typeId but is generally a 1-1 mapping.
      if (material.uniforms.typeId) {
        // negate the value if dehighlighted.
        // see implementation in CompositePass.ts for how the value is interpreted
        material.uniforms.typeId.value = this.signedTypeId();
        material.uniformsNeedUpdate = true;
      }
      if (material.uniforms.instanceId) {
        material.uniforms.instanceId.value = Number(this.agentData.instanceId);
        material.uniformsNeedUpdate = true;
      }
      if (material.uniforms.radius) {
        var lod = 0;
        material.uniforms.radius.value = (lod + 1) * 0.25; // * 8;
        material.uniformsNeedUpdate = true;
      }
    }
  }, {
    key: "hideAndDeactivate",
    value: function hideAndDeactivate() {
      this.active = false;
    }
  }, {
    key: "updateFiber",
    value: function updateFiber(subpoints) {
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
      // put all the subpoints into a Vector3[]
      var curvePoints = [];
      for (var j = 0; j < numSubPoints; j += 3) {
        var x = subpoints[j];
        var y = subpoints[j + 1];
        var z = subpoints[j + 2];
        curvePoints.push(new Vector3(x, y, z));
      }

      // set up new fiber as curved tube
      this.fiberCurve = new CatmullRomCurve3(curvePoints);
    }
  }, {
    key: "getFollowPosition",
    value: function getFollowPosition() {
      var pos = new Vector3(this.agentData.x, this.agentData.y, this.agentData.z);
      if (this.agentData["vis-type"] === VisTypes.ID_VIS_TYPE_FIBER && this.fiberCurve) {
        return this.fiberCurve.getPoint(0.5).add(pos);
      } else {
        return pos;
      }
    }
  }]);
  return VisAgent;
}();
_defineProperty(VisAgent, "UNASSIGNED_MESH_COLOR", 0xff00ff);
_defineProperty(VisAgent, "UNASSIGNED_NAME_PREFIX", "Unassigned");
export { VisAgent as default };