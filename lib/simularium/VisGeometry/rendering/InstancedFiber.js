"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InstancedFiberGroup = exports.InstancedFiber = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _three = require("three");

var _InstancedFiberShader = require("./InstancedFiberShader");

var _MultipassMaterials = require("./MultipassMaterials");

function createTubeGeometry() {
  var numSides = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 8;
  var subdivisions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 50;
  var openEnded = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  // create a base CylinderGeometry which handles UVs, end caps and faces
  var radius = 1;
  var length = 1;
  var baseGeometry = new _three.CylinderGeometry(radius, radius, length, numSides, subdivisions, openEnded); // fix the orientation so X can act as arc length

  baseGeometry.rotateZ(Math.PI / 2); // compute the radial angle for each position for later extrusion

  var tmpVec = new _three.Vector2();
  var xPositions = [];
  var angles = [];
  var uvs = [];
  var vertices = baseGeometry.attributes.position.array;
  var faceVertexUvs = baseGeometry.attributes.uv.array; // assume index is not null

  var indices = baseGeometry.index.array; //  const faceVertexUvs = baseGeometry.faceVertexUvs[0];
  // Now go through each face and un-index the geometry.

  var _loop = function _loop(i) {
    var a = indices[i];
    var b = indices[i + 1];
    var c = indices[i + 2];
    var v0 = new _three.Vector3(vertices[a * 3 + 0], vertices[a * 3 + 1], vertices[a * 3 + 2]);
    var v1 = new _three.Vector3(vertices[b * 3 + 0], vertices[b * 3 + 1], vertices[b * 3 + 2]);
    var v2 = new _three.Vector3(vertices[c * 3 + 0], vertices[c * 3 + 1], vertices[c * 3 + 2]);
    var verts = [v0, v1, v2];
    var faceUvs = [new _three.Vector2(faceVertexUvs[a * 2 + 0], faceVertexUvs[a * 2 + 1]), new _three.Vector2(faceVertexUvs[b * 2 + 0], faceVertexUvs[b * 2 + 1]), new _three.Vector2(faceVertexUvs[c * 2 + 0], faceVertexUvs[c * 2 + 1])]; //faceVertexUvs[i];
    // For each vertex in this face...

    verts.forEach(function (v, j) {
      tmpVec.set(v.y, v.z).normalize(); // the radial angle around the tube

      var angle = Math.atan2(tmpVec.y, tmpVec.x);
      angles.push(angle); // "arc length" in range [-0.5 .. 0.5]

      xPositions.push(v.x); // copy over the UV for this vertex

      uvs.push(faceUvs[j].toArray());
    });
  };

  for (var i = 0; i < indices.length; i += 3) {
    _loop(i);
  } // build typed arrays for our attributes


  var posArray = new Float32Array(xPositions);
  var angleArray = new Float32Array(angles);
  var uvArray = new Float32Array(uvs.length * 2); // unroll UVs

  for (var _i = 0; _i < posArray.length; _i++) {
    var _uvs$_i = (0, _slicedToArray2["default"])(uvs[_i], 2),
        u = _uvs$_i[0],
        v = _uvs$_i[1];

    uvArray[_i * 2 + 0] = u;
    uvArray[_i * 2 + 1] = v;
  }

  var geometry = new _three.BufferGeometry();
  geometry.setAttribute("position", new _three.BufferAttribute(posArray, 1));
  geometry.setAttribute("angle", new _three.BufferAttribute(angleArray, 1));
  geometry.setAttribute("uv", new _three.BufferAttribute(uvArray, 2)); // dispose old geometry since we no longer need it

  baseGeometry.dispose();
  return geometry;
}

var InstancedFiber = /*#__PURE__*/function () {
  // number of control points per curve instance
  // x,y,z,scale
  // instance id, type id (color index)
  // holds control points for all the curves
  // while updating instances
  function InstancedFiber(nCurvePoints, count) {
    (0, _classCallCheck2["default"])(this, InstancedFiber);
    (0, _defineProperty2["default"])(this, "nCurvePoints", void 0);
    (0, _defineProperty2["default"])(this, "nRadialSections", void 0);
    (0, _defineProperty2["default"])(this, "nSegments", void 0);
    (0, _defineProperty2["default"])(this, "curveGeometry", void 0);
    (0, _defineProperty2["default"])(this, "mesh", void 0);
    (0, _defineProperty2["default"])(this, "shaderSet", void 0);
    (0, _defineProperty2["default"])(this, "instancedGeometry", void 0);
    (0, _defineProperty2["default"])(this, "positionAttribute", void 0);
    (0, _defineProperty2["default"])(this, "instanceAttribute", void 0);
    (0, _defineProperty2["default"])(this, "curveData", void 0);
    (0, _defineProperty2["default"])(this, "currentInstance", void 0);
    (0, _defineProperty2["default"])(this, "isUpdating", void 0);
    this.nRadialSections = 8;
    this.nSegments = (nCurvePoints - 1) * 4;
    this.nCurvePoints = nCurvePoints;
    this.currentInstance = 0;
    this.isUpdating = false;
    this.instancedGeometry = new _three.InstancedBufferGeometry();
    this.instancedGeometry.instanceCount = 0;
    this.shaderSet = (0, _InstancedFiberShader.createShaders)(this.nSegments, this.nCurvePoints); // make typescript happy. these will be reallocated in reallocate()

    this.curveGeometry = new _three.BufferGeometry();
    this.positionAttribute = new _three.InstancedBufferAttribute(Uint8Array.from([]), 1);
    this.instanceAttribute = new _three.InstancedBufferAttribute(Uint8Array.from([]), 1);
    this.curveData = new _three.DataTexture(Uint8Array.from([]), 0, 0);
    this.mesh = new _three.Mesh(this.instancedGeometry);
    this.mesh.name = "fibers_".concat(nCurvePoints);
    this.mesh.frustumCulled = false;
    this.reallocate(count);
  }

  (0, _createClass2["default"])(InstancedFiber, [{
    key: "getMesh",
    value: function getMesh() {
      return this.mesh;
    }
  }, {
    key: "getShaders",
    value: function getShaders() {
      return this.shaderSet;
    }
  }, {
    key: "getCapacity",
    value: function getCapacity() {
      // number of rows in texture is number of curves this can hold
      return this.curveData.image.height;
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
      this.dispose(); // build new data texture
      // one row per curve, number of colums = num of curve control pts
      // TODO: consolidate space better.

      var newData = new Float32Array(n * this.nCurvePoints * 3); // start by copying the old data into the new array
      // ASSUMES THERE IS SPACE. This depends on reallocate only growing the array.
      // Otherwise an exception is thrown.

      var oldData = this.curveData.image.data;
      newData.set(oldData);
      this.curveData = new _three.DataTexture(newData, this.nCurvePoints, n, _three.RGBFormat, _three.FloatType);
      this.curveGeometry = createTubeGeometry(this.nRadialSections, this.nSegments, false); // we must create a new Geometry to have things update correctly

      this.instancedGeometry = new _three.InstancedBufferGeometry().copy(this.curveGeometry); // install the new geometry into our Mesh object

      this.mesh.geometry = this.instancedGeometry;
      this.instancedGeometry.setDrawRange(0, this.curveGeometry.getAttribute("position").count);
      this.shaderSet.mat.uniforms.curveData.value = this.curveData; // make new array,
      // copy old array into it,
      // reset into instancedGeometry

      var newPos = new Float32Array(4 * n);
      newPos.set(this.positionAttribute.array);
      this.positionAttribute = new _three.InstancedBufferAttribute(newPos, 4, false);
      this.instancedGeometry.setAttribute("translateAndScale", this.positionAttribute);
      var newInst = new Float32Array(3 * n);
      newInst.set(this.instanceAttribute.array);
      this.instanceAttribute = new _three.InstancedBufferAttribute(newInst, 3, false);
      this.instancedGeometry.setAttribute("instanceAndTypeId", this.instanceAttribute);
    }
  }, {
    key: "dispose",
    value: function dispose() {
      this.instancedGeometry.dispose();
      this.curveData.dispose();
      this.curveGeometry.dispose();
    }
  }, {
    key: "beginUpdate",
    value: function beginUpdate() {
      this.isUpdating = true;
      this.currentInstance = 0;
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
    value: function addInstance(curvePts, x, y, z, scale, uniqueAgentId, typeId) {
      var offset = this.currentInstance;
      this.checkRealloc(this.currentInstance + 1);
      this.positionAttribute.setXYZW(offset, x, y, z, scale);
      this.instanceAttribute.setXYZ(offset, uniqueAgentId, typeId, this.currentInstance);

      for (var i = 0; i < Math.min(curvePts.length / 3, this.nCurvePoints); ++i) {
        var _offset = this.currentInstance * this.nCurvePoints * 3 + i * 3;

        this.curveData.image.data[_offset + 0] = curvePts[i * 3 + 0];
        this.curveData.image.data[_offset + 1] = curvePts[i * 3 + 1];
        this.curveData.image.data[_offset + 2] = curvePts[i * 3 + 2];
      }

      this.currentInstance++;
    }
  }, {
    key: "endUpdate",
    value: function endUpdate() {
      this.updateInstanceCount(this.currentInstance); // assumes the entire buffers are invalidated.

      this.instanceAttribute.needsUpdate = true;
      this.positionAttribute.needsUpdate = true;
      this.curveData.needsUpdate = true;
      this.isUpdating = false;
    }
  }]);
  return InstancedFiber;
}();

exports.InstancedFiber = InstancedFiber;

var InstancedFiberGroup = /*#__PURE__*/function () {
  function InstancedFiberGroup() {
    (0, _classCallCheck2["default"])(this, InstancedFiberGroup);
    (0, _defineProperty2["default"])(this, "fibers", void 0);
    (0, _defineProperty2["default"])(this, "fibersGroup", void 0);
    (0, _defineProperty2["default"])(this, "isUpdating", void 0);
    this.fibersGroup = new _three.Group();
    this.fibers = [];
    this.isUpdating = false;
  }

  (0, _createClass2["default"])(InstancedFiberGroup, [{
    key: "getGroup",
    value: function getGroup() {
      var _this = this;

      for (var i = this.fibersGroup.children.length - 1; i >= 0; i--) {
        this.fibersGroup.remove(this.fibersGroup.children[i]);
      }

      this.fibers.forEach(function (fiber) {
        _this.fibersGroup.add(fiber.getMesh());
      });
      this.fibersGroup.name = InstancedFiberGroup.GROUP_NAME;
      return this.fibersGroup;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.fibers.forEach(function (fiber) {
        fiber.dispose();
      });
      this.fibers = [];
    }
  }, {
    key: "beginUpdate",
    value: function beginUpdate() {
      this.fibers.forEach(function (fiber) {
        fiber.beginUpdate();
      });
      this.isUpdating = true;
    }
  }, {
    key: "addInstance",
    value: function addInstance(nCurvePts, curvePts, x, y, z, scale, uniqueAgentId, typeId) {
      if (!this.fibers[nCurvePts]) {
        // create new
        this.fibers[nCurvePts] = new InstancedFiber(nCurvePts, 256);
      }

      this.fibers[nCurvePts].addInstance(curvePts, x, y, z, scale, uniqueAgentId, typeId);
    }
  }, {
    key: "endUpdate",
    value: function endUpdate() {
      this.fibers.forEach(function (fiber) {
        fiber.endUpdate();
      });
      this.isUpdating = false;
    }
  }, {
    key: "setRenderPass",
    value: function setRenderPass() {
      this.fibers.forEach(function (fiber) {
        (0, _MultipassMaterials.setRenderPass)(fiber.getMesh(), fiber.getShaders());
      });
    }
  }, {
    key: "updateProjectionMatrix",
    value: function updateProjectionMatrix(cam) {
      this.fibers.forEach(function (fiber) {
        (0, _MultipassMaterials.updateProjectionMatrix)(fiber.getShaders(), cam);
      });
    }
  }]);
  return InstancedFiberGroup;
}();

exports.InstancedFiberGroup = InstancedFiberGroup;
(0, _defineProperty2["default"])(InstancedFiberGroup, "GROUP_NAME", "fibers");