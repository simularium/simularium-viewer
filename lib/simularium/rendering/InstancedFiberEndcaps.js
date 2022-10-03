"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _three = require("three");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var InstancedFiberEndcaps = /*#__PURE__*/function () {
  // x,y,z,scale
  // quaternion xyzw
  // instance id, type id (color index)
  function InstancedFiberEndcaps() {
    _classCallCheck(this, InstancedFiberEndcaps);

    _defineProperty(this, "endcapGeometry", void 0);

    _defineProperty(this, "mesh", void 0);

    _defineProperty(this, "instancedGeometry", void 0);

    _defineProperty(this, "positionAttribute", void 0);

    _defineProperty(this, "rotationAttribute", void 0);

    _defineProperty(this, "instanceAttribute", void 0);

    _defineProperty(this, "currentInstance", void 0);

    _defineProperty(this, "isUpdating", void 0);

    this.mesh = new _three.Mesh();
    this.instancedGeometry = new _three.InstancedBufferGeometry();
    this.positionAttribute = new _three.InstancedBufferAttribute(new Float32Array(), 4, false);
    this.rotationAttribute = new _three.InstancedBufferAttribute(new Float32Array(), 4, false);
    this.instanceAttribute = new _three.InstancedBufferAttribute(new Float32Array(), 2, false);
    this.currentInstance = 0;
    this.isUpdating = false;
    this.endcapGeometry = new _three.SphereBufferGeometry(1, 8, 8);
  }

  _createClass(InstancedFiberEndcaps, [{
    key: "create",
    value: function create(n) {
      this.reallocate(n);
      this.instancedGeometry.instanceCount = n;
      this.mesh = new _three.Mesh(this.instancedGeometry);
      this.mesh.frustumCulled = false;
    }
  }, {
    key: "getMesh",
    value: function getMesh() {
      return this.mesh;
    }
  }, {
    key: "updateInstanceCount",
    value: function updateInstanceCount(n) {
      //console.log("total draws = " + n);
      this.instancedGeometry.instanceCount = n;
    }
  }, {
    key: "reallocate",
    value: function reallocate(n) {
      // tell threejs/webgl that we can discard the old buffers
      this.instancedGeometry.dispose(); // we must create a new Geometry to have things update correctly

      this.instancedGeometry = new _three.InstancedBufferGeometry().copy(this.endcapGeometry); // install the new geometry into our Mesh object

      this.mesh.geometry = this.instancedGeometry; // make new array,
      // copy old array into it,
      // reset into instancedGeometry

      var newPos = new Float32Array(4 * n);
      newPos.set(this.positionAttribute.array);
      this.positionAttribute = new _three.InstancedBufferAttribute(newPos, 4, false);
      this.instancedGeometry.setAttribute("translateAndScale", this.positionAttribute);
      var newRot = new Float32Array(4 * n);
      newRot.set(this.rotationAttribute.array);
      this.rotationAttribute = new _three.InstancedBufferAttribute(newRot, 4, false);
      this.instancedGeometry.setAttribute("rotationQ", this.rotationAttribute);
      var newInst = new Float32Array(2 * n);
      newInst.set(this.instanceAttribute.array);
      this.instanceAttribute = new _three.InstancedBufferAttribute(newInst, 2, false);
      this.instancedGeometry.setAttribute("instanceAndTypeId", this.instanceAttribute);
    }
  }, {
    key: "beginUpdate",
    value: function beginUpdate(nAgents) {
      // do we need to increase storage?
      var increment = 4096; // total num instances possible in buffer

      var currentNumInstances = this.instanceAttribute.count; // num of instances needed

      var requestedNumInstances = nAgents * 2;

      if (requestedNumInstances > currentNumInstances) {
        // increase to next multiple of increment
        var newInstanceCount = (Math.trunc(requestedNumInstances / increment) + 1) * increment;
        this.reallocate(newInstanceCount);
      }

      this.isUpdating = true;
      this.currentInstance = 0;
    }
  }, {
    key: "addInstance",
    value: function addInstance(x, y, z, scale, qx, qy, qz, qw, instanceId, typeId, c) {
      var offset = this.currentInstance;
      this.positionAttribute.setXYZW(offset, x, y, z, scale);
      this.instanceAttribute.setXY(offset, instanceId, typeId);
      this.rotationAttribute.setXYZW(offset, qx, qy, qz, qw);
      this.currentInstance++;
    }
  }, {
    key: "endUpdate",
    value: function endUpdate() {
      this.updateInstanceCount(this.currentInstance); // assumes the entire buffers are invalidated.

      this.instanceAttribute.needsUpdate = true;
      this.rotationAttribute.needsUpdate = true;
      this.positionAttribute.needsUpdate = true;
      this.isUpdating = false;
    }
  }]);

  return InstancedFiberEndcaps;
}();

var _default = InstancedFiberEndcaps;
exports.default = _default;