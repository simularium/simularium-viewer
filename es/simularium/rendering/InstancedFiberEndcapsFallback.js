function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import { SphereBufferGeometry, InstancedMesh, MeshLambertMaterial, Matrix4, Vector3, Quaternion } from "three";

var InstancedFiberEndcapsFallback = /*#__PURE__*/function () {
  function InstancedFiberEndcapsFallback() {
    _classCallCheck(this, InstancedFiberEndcapsFallback);

    _defineProperty(this, "endcapGeometry", void 0);

    _defineProperty(this, "fallbackMesh", void 0);

    _defineProperty(this, "currentInstance", void 0);

    _defineProperty(this, "isUpdating", void 0);

    this.currentInstance = 0;
    this.isUpdating = false;
    this.endcapGeometry = new SphereBufferGeometry(1, 8, 8);
    this.fallbackMesh = new InstancedMesh(this.endcapGeometry, new MeshLambertMaterial(), 0);
  }

  _createClass(InstancedFiberEndcapsFallback, [{
    key: "create",
    value: function create(n) {
      this.fallbackMesh = new InstancedMesh(this.endcapGeometry, new MeshLambertMaterial(), n);
    }
  }, {
    key: "getMesh",
    value: function getMesh() {
      return this.fallbackMesh;
    }
  }, {
    key: "updateInstanceCount",
    value: function updateInstanceCount(n) {
      this.fallbackMesh.count = n;
    }
  }, {
    key: "reallocate",
    value: function reallocate(n) {
      this.fallbackMesh = new InstancedMesh(this.endcapGeometry, new MeshLambertMaterial(), n);
    }
  }, {
    key: "beginUpdate",
    value: function beginUpdate(nAgents) {
      // do we need to increase storage?
      var increment = 4096;
      var currentNumInstances = this.fallbackMesh.instanceMatrix.array.length / 16;
      var requestedNumInstances = nAgents * 2; // two instances per agent.

      if (requestedNumInstances > currentNumInstances) {
        // increase to next multiple of 4096 above nAgents
        var newInstanceCount = (Math.trunc(requestedNumInstances / increment) + 1) * increment;
        console.log("realloc to " + newInstanceCount + " instances");
        this.reallocate(newInstanceCount);
      }

      this.isUpdating = true;
      this.currentInstance = 0;
    }
  }, {
    key: "addInstance",
    value: function addInstance(x, y, z, scale, qx, qy, qz, qw, instanceId, typeId, c) {
      var offset = this.currentInstance;
      this.fallbackMesh.setMatrixAt(offset, new Matrix4().compose(new Vector3(x, y, z), new Quaternion(qx, qy, qz, qw), new Vector3(scale, scale, scale)));
      this.fallbackMesh.setColorAt(offset, c);
      this.currentInstance++;
    }
  }, {
    key: "endUpdate",
    value: function endUpdate() {
      this.updateInstanceCount(this.currentInstance);
      this.fallbackMesh.instanceMatrix.needsUpdate = true;
      this.isUpdating = false;
    }
  }]);

  return InstancedFiberEndcapsFallback;
}();

export default InstancedFiberEndcapsFallback;