import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Box3, Euler, Group, Quaternion, Vector3, Vector4 } from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import MetaballMeshShaders from "./MetaballMeshShader.js";
var MetaballMesh = /*#__PURE__*/function () {
  // to act like an instancedmesh for GeometryStore purposes
  // but each instance is a whole MarchingCubes object
  function MetaballMesh(name) {
    _classCallCheck(this, MetaballMesh);
    _defineProperty(this, "drawable", void 0);
    _defineProperty(this, "shaderSet", void 0);
    this.drawable = new Group();
    this.drawable.name = name;
    this.shaderSet = MetaballMeshShaders.shaderSet;
  }
  return _createClass(MetaballMesh, [{
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
    key: "instanceCount",
    value: function instanceCount() {
      return this.drawable.children.length;
    }
  }, {
    key: "beginUpdate",
    value: function beginUpdate() {
      // remove all from group!
      for (var i = this.drawable.children.length - 1; i >= 0; i--) {
        this.drawable.remove(this.drawable.children[i]);
      }
    }
  }, {
    key: "endUpdate",
    value: function endUpdate() {
      // no op
    }
  }, {
    key: "replaceGeometry",
    value: function replaceGeometry(_newGeom, _meshName) {
      // no op
    }
  }, {
    key: "addInstance",
    value: function addInstance(x, y, z, scale, rx, ry, rz, uniqueAgentId, typeId) {
      var lodScale = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : 1;
      var subPoints = arguments.length > 10 && arguments[10] !== undefined ? arguments[10] : [];
      // MARCHING CUBES

      var mat = this.shaderSet.mat.clone();
      mat.uniforms.translateAndScale.value = new Vector4(x, y, z, scale);
      mat.uniforms.rotation.value = new Quaternion().setFromEuler(new Euler(rx, ry, rz));
      mat.uniforms.instanceAndTypeId.value = new Vector3(uniqueAgentId, typeId, lodScale);

      // what is a good value here?
      var resolution = 28;
      var enableNormals = true;
      var enableColors = false;
      var enableUvs = false;
      // buffer will be this size * 3 floats (?)
      // maybe can figure this out from number of balls
      var maxPolyCount = 65535;

      // TODO consider this implementation instead:
      // https://github.com/sjpt/metaballsWebgl

      var effect = new MarchingCubes(resolution, mat, enableNormals, enableColors, maxPolyCount);
      effect.position.set(0, 0, 0);
      effect.scale.set(1, 1, 1);
      effect.enableUvs = enableUvs;
      effect.enableColors = enableColors;
      var bound = new Box3();
      var maxRadius = 0;
      for (var i = 0; i < subPoints.length; i += 4) {
        bound.expandByPoint(new Vector3(subPoints[i], subPoints[i + 1], subPoints[i + 2]));
        if (subPoints[i + 3] > maxRadius) {
          maxRadius = subPoints[i + 3];
        }
      }
      bound.expandByScalar(maxRadius);
      // now we have bounds and we can normalize the coordinates to size of box
      var boundSize = new Vector3();
      bound.getSize(boundSize);
      var center = new Vector3();
      bound.getCenter(center);
      for (var _i = 0; _i < subPoints.length; _i += 4) {
        // radius = sqrt(strenght/subtract)
        var strength = subPoints[_i + 3];
        var subtract = 1.0;

        // xyz must be 0..1 coordinates within the volume of the metaballs object.
        // therefore we need to take the object space coordinates and radii,
        // figure out max bounds, and compute relative positioning.
        // TODO allow space around axes that are not the longest
        var _x = (subPoints[_i + 0] - bound.min.x) / boundSize.x;
        var _y = (subPoints[_i + 1] - bound.min.y) / boundSize.y;
        var _z = (subPoints[_i + 2] - bound.min.z) / boundSize.z;
        // could put bounds in subpoints to preprocess?
        // metaball volume resolution will be a uniform resolution^3 grid
        // so the grid will not be tightly fit to the bounds if the bounds are not a cube
        effect.addBall(_x, _y, _z, strength, subtract);
      }
      effect.visible = true;
      // forcing this so that the mesh is truly generated by the time we are ready to call render
      // without this line there is a blank frame and a flicker
      effect.onBeforeRender(undefined, undefined, undefined, effect.geometry, mat, undefined);
      this.drawable.add(effect);
    }
  }]);
}();
export { MetaballMesh };