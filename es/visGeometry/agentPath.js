import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { Color, BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from "three";
var MAX_PATH_LENGTH = 32;

function lerp(x0, x1, alpha) {
  return x0 + (x1 - x0) * alpha;
}

var LinePath = /*#__PURE__*/function () {
  function LinePath(color) {
    var maxSegments = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MAX_PATH_LENGTH;

    _classCallCheck(this, LinePath);

    _defineProperty(this, "numSegments", void 0);

    _defineProperty(this, "maxSegments", void 0);

    _defineProperty(this, "color", void 0);

    _defineProperty(this, "points", void 0);

    _defineProperty(this, "colors", void 0);

    _defineProperty(this, "geometry", void 0);

    _defineProperty(this, "material", void 0);

    _defineProperty(this, "line", void 0);

    var pointsArray = new Float32Array(maxSegments * 3 * 2);
    var colorsArray = new Float32Array(maxSegments * 3 * 2);
    var lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new BufferAttribute(pointsArray, 3));
    lineGeometry.setAttribute("color", new BufferAttribute(colorsArray, 3)); // path starts empty: draw range spans nothing

    lineGeometry.setDrawRange(0, 0); // the line will be colored per-vertex

    var lineMaterial = new LineBasicMaterial({
      vertexColors: true
    });
    var lineObject = new LineSegments(lineGeometry, lineMaterial);
    lineObject.frustumCulled = false;
    this.numSegments = 0;
    this.maxSegments = maxSegments;
    this.color = color || new Color(0xffffff);
    this.points = pointsArray;
    this.colors = colorsArray;
    this.geometry = lineGeometry;
    this.material = lineMaterial;
    this.line = lineObject;
  }

  _createClass(LinePath, [{
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

export { LinePath as default };