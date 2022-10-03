"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InstancedMesh = exports.InstanceType = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _three = require("three");

var _InstancedMeshShader = _interopRequireDefault(require("./InstancedMeshShader"));

var _PDBGBufferShaders = _interopRequireDefault(require("./PDBGBufferShaders"));

var tmpQuaternion = new _three.Quaternion();
var tmpEuler = new _three.Euler();
var InstanceType;
exports.InstanceType = InstanceType;

(function (InstanceType) {
  InstanceType[InstanceType["MESH"] = 0] = "MESH";
  InstanceType[InstanceType["POINTS"] = 1] = "POINTS";
})(InstanceType || (exports.InstanceType = InstanceType = {}));

var InstancedMesh = /*#__PURE__*/function () {
  // x,y,z,scale
  // quaternion
  // instance id, type id (color index), lod scale
  // while updating instances
  function InstancedMesh(type, baseGeometry, name, count) {
    (0, _classCallCheck2["default"])(this, InstancedMesh);
    (0, _defineProperty2["default"])(this, "baseGeometry", void 0);
    (0, _defineProperty2["default"])(this, "drawable", void 0);
    (0, _defineProperty2["default"])(this, "shaderSet", void 0);
    (0, _defineProperty2["default"])(this, "instancedGeometry", void 0);
    (0, _defineProperty2["default"])(this, "positionAttribute", void 0);
    (0, _defineProperty2["default"])(this, "rotationAttribute", void 0);
    (0, _defineProperty2["default"])(this, "instanceAttribute", void 0);
    (0, _defineProperty2["default"])(this, "currentInstance", void 0);
    (0, _defineProperty2["default"])(this, "isUpdating", void 0);
    this.baseGeometry = baseGeometry;
    this.drawable = type === InstanceType.MESH ? new _three.Mesh(baseGeometry) : new _three.Points(baseGeometry);
    this.drawable.name = name;
    this.currentInstance = 0;
    this.isUpdating = false;
    this.instancedGeometry = new _three.InstancedBufferGeometry();
    this.instancedGeometry.instanceCount = 0;
    this.shaderSet = type === InstanceType.MESH ? _InstancedMeshShader["default"].shaderSet : _PDBGBufferShaders["default"].shaderSet; // make typescript happy. these will be reallocated in reallocate()

    this.positionAttribute = new _three.InstancedBufferAttribute(Uint8Array.from([]), 1);
    this.rotationAttribute = new _three.InstancedBufferAttribute(Uint8Array.from([]), 1);
    this.instanceAttribute = new _three.InstancedBufferAttribute(Uint8Array.from([]), 1); // because instanced, threejs needs to know not to early cull

    this.drawable.frustumCulled = false;
    this.reallocate(count);
  }

  (0, _createClass2["default"])(InstancedMesh, [{
    key: "getMesh",
    value: function getMesh() {
      return this.drawable;
    }
  }, {
    key: "getShaders",
    value: function getShaders() {
      return this.shaderSet;
    }
  }, {
    key: "getCapacity",
    value: function getCapacity() {
      return this.instanceAttribute.count;
    }
  }, {
    key: "instanceCount",
    value: function instanceCount() {
      return this.instancedGeometry.instanceCount;
    }
  }, {
    key: "updateInstanceCount",
    value: function updateInstanceCount(n) {
      //console.log("total draws = " + n);
      this.instancedGeometry.instanceCount = n;
    }
  }, {
    key: "replaceGeometry",
    value: function replaceGeometry(geometry, name) {
      // TODO this does not handle changing mesh to points or vice versa.
      // e.g you can't have PDBs start out as spheres and then async transition to PDBs
      this.drawable.name = name;
      this.baseGeometry = geometry;
      this.reallocate(this.getCapacity());
    }
  }, {
    key: "reallocate",
    value: function reallocate(n) {
      // tell threejs/webgl that we can discard the old buffers
      this.dispose(); // we must create a new Geometry to have things update correctly

      this.instancedGeometry = new _three.InstancedBufferGeometry().copy(this.baseGeometry); // install the new geometry into our Mesh object

      this.drawable.geometry = this.instancedGeometry; // make new array,
      // copy old array into it,
      // reset into instancedGeometry

      var newPos = new Float32Array(4 * n);
      newPos.set(this.positionAttribute.array);
      this.positionAttribute = new _three.InstancedBufferAttribute(newPos, 4, false);
      this.instancedGeometry.setAttribute("translateAndScale", this.positionAttribute);
      var newRot = new Float32Array(4 * n);
      newRot.set(this.rotationAttribute.array);
      this.rotationAttribute = new _three.InstancedBufferAttribute(newRot, 4, false);
      this.instancedGeometry.setAttribute("rotation", this.rotationAttribute);
      var newInst = new Float32Array(3 * n);
      newInst.set(this.instanceAttribute.array);
      this.instanceAttribute = new _three.InstancedBufferAttribute(newInst, 3, false);
      this.instancedGeometry.setAttribute("instanceAndTypeId", this.instanceAttribute);
    }
  }, {
    key: "dispose",
    value: function dispose() {
      this.instancedGeometry.dispose(); //this.meshGeometry.dispose();
    }
  }, {
    key: "beginUpdate",
    value: function beginUpdate() {
      this.isUpdating = true;
      this.currentInstance = 0;
      this.updateInstanceCount(0);
    }
  }, {
    key: "checkRealloc",
    value: function checkRealloc(count) {
      // do we need to increase storage?
      var increment = 256; // total num instances possible in buffer
      // (could also check number of rows in datatexture)

      var currentNumInstances = this.instanceAttribute.count; // num of instances needed

      var requestedNumInstances = count;

      if (requestedNumInstances > currentNumInstances) {
        // increase to next multiple of increment
        var newInstanceCount = (Math.trunc(requestedNumInstances / increment) + 1) * increment;
        this.reallocate(newInstanceCount);
      }
    }
  }, {
    key: "addInstance",
    value: function addInstance(x, y, z, scale, rx, ry, rz, uniqueAgentId, typeId) {
      var lodScale = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : 1;

      var _subPoints = arguments.length > 10 && arguments[10] !== undefined ? arguments[10] : [];

      var offset = this.currentInstance;
      this.checkRealloc(this.currentInstance + 1);
      this.positionAttribute.setXYZW(offset, x, y, z, scale);
      var q = tmpQuaternion.setFromEuler(tmpEuler.set(rx, ry, rz));
      this.rotationAttribute.setXYZW(offset, q.x, q.y, q.z, q.w);
      this.instanceAttribute.setXYZ(offset, uniqueAgentId, typeId, lodScale);
      this.currentInstance++;
    }
  }, {
    key: "endUpdate",
    value: function endUpdate() {
      this.updateInstanceCount(this.currentInstance); // assumes the entire buffers are invalidated.

      this.instanceAttribute.needsUpdate = true;
      this.positionAttribute.needsUpdate = true;
      this.rotationAttribute.needsUpdate = true;
      this.isUpdating = false;
    }
  }]);
  return InstancedMesh;
}();

exports.InstancedMesh = InstancedMesh;