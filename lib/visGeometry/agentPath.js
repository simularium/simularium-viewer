"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _three = require("three");

var MAX_PATH_LENGTH = 32;

function lerp(x0, x1, alpha) {
  return x0 + (x1 - x0) * alpha;
}

var LinePath = /*#__PURE__*/function () {
  function LinePath(color) {
    var maxSegments = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MAX_PATH_LENGTH;
    (0, _classCallCheck2["default"])(this, LinePath);
    (0, _defineProperty2["default"])(this, "numSegments", void 0);
    (0, _defineProperty2["default"])(this, "maxSegments", void 0);
    (0, _defineProperty2["default"])(this, "color", void 0);
    (0, _defineProperty2["default"])(this, "points", void 0);
    (0, _defineProperty2["default"])(this, "colors", void 0);
    (0, _defineProperty2["default"])(this, "geometry", void 0);
    (0, _defineProperty2["default"])(this, "material", void 0);
    (0, _defineProperty2["default"])(this, "line", void 0);
    var pointsArray = new Float32Array(maxSegments * 3 * 2);
    var colorsArray = new Float32Array(maxSegments * 3 * 2);
    var lineGeometry = new _three.BufferGeometry();
    lineGeometry.setAttribute("position", new _three.BufferAttribute(pointsArray, 3));
    lineGeometry.setAttribute("color", new _three.BufferAttribute(colorsArray, 3)); // path starts empty: draw range spans nothing

    lineGeometry.setDrawRange(0, 0); // the line will be colored per-vertex

    var lineMaterial = new _three.LineBasicMaterial({
      vertexColors: true
    });
    var lineObject = new _three.LineSegments(lineGeometry, lineMaterial);
    lineObject.frustumCulled = false;
    this.numSegments = 0;
    this.maxSegments = maxSegments;
    this.color = color || new _three.Color(0xffffff);
    this.points = pointsArray;
    this.colors = colorsArray;
    this.geometry = lineGeometry;
    this.material = lineMaterial;
    this.line = lineObject;
  }

  (0, _createClass2["default"])(LinePath, [{
    key: "show",
    value: function show(visible) {
      this.line.visible = visible;
    }
  }, {
    key: "addPointToPath",
    value: function addPointToPath(x, y, z, dx, dy, dz, pathEndColor) {
      // check for paths at max length
      if (this.numSegments === this.maxSegments) {
        // because we append to the end, we can copyWithin to move points up to the beginning
        // as a means of removing the first point in the path.
        // shift the points:
        this.points.copyWithin(0, 3 * 2, this.maxSegments * 3 * 2);
        this.numSegments = this.maxSegments - 1;
      } else {
        // rewrite all the colors. this might be prohibitive for lots of long paths.
        for (var ic = 0; ic < this.numSegments + 1; ++ic) {
          // the very first point should be a=1
          var a = 1.0 - ic / (this.numSegments + 1);
          this.colors[ic * 6 + 0] = lerp(this.color.r, pathEndColor.r, a);
          this.colors[ic * 6 + 1] = lerp(this.color.g, pathEndColor.g, a);
          this.colors[ic * 6 + 2] = lerp(this.color.b, pathEndColor.b, a); // the very last point should be b=0

          var b = 1.0 - (ic + 1) / (this.numSegments + 1);
          this.colors[ic * 6 + 3] = lerp(this.color.r, pathEndColor.r, b);
          this.colors[ic * 6 + 4] = lerp(this.color.g, pathEndColor.g, b);
          this.colors[ic * 6 + 5] = lerp(this.color.b, pathEndColor.b, b);
        }

        this.line.geometry.attributes.color.needsUpdate = true;
      } // add a segment to this line


      this.points[this.numSegments * 2 * 3 + 0] = x - dx;
      this.points[this.numSegments * 2 * 3 + 1] = y - dy;
      this.points[this.numSegments * 2 * 3 + 2] = z - dz;
      this.points[this.numSegments * 2 * 3 + 3] = x;
      this.points[this.numSegments * 2 * 3 + 4] = y;
      this.points[this.numSegments * 2 * 3 + 5] = z;
      this.numSegments++;
      this.line.geometry.setDrawRange(0, this.numSegments * 2);
      this.line.geometry.attributes.position.needsUpdate = true; // required after the first render
    }
  }]);
  return LinePath;
}();

exports["default"] = LinePath;