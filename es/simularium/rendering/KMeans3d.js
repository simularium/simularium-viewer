function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// assumes arrays of equal length
function areArraysClose(a, b, epsilon) {
  for (var i = 0; i < a.length; ++i) {
    if (Math.abs(a[i] - b[i]) > epsilon) {
      return false;
    }
  }

  return true;
}

function findMin(arr) {
  var m = Number.MAX_VALUE;

  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] < m) {
      m = arr[i];
    }
  }

  return m;
}
/**
 * KMeans
 *       This is a ported and optimized version of code explained here:
 *       https://miguelmota.com/blog/k-means-clustering-in-javascript/
 *       https://burakkanber.com/blog/machine-learning-k-means-clustering-in-javascript-part-1/
 *
 * @constructor
 * @desc KMeans constructor
 * @param {object} options - options object
 * @param {array} options.data - data array with points
 * @param {number} options.k - number of cluster centroids
 * @return array with arrays of points
 */


var KMeans = /*#__PURE__*/function () {
  function KMeans(opts) {
    _classCallCheck(this, KMeans);

    _defineProperty(this, "k", void 0);

    _defineProperty(this, "data", void 0);

    _defineProperty(this, "assignments", void 0);

    _defineProperty(this, "extents", void 0);

    _defineProperty(this, "ranges", void 0);

    _defineProperty(this, "means", void 0);

    _defineProperty(this, "iterations", void 0);

    _defineProperty(this, "drawDelay", void 0);

    _defineProperty(this, "timer", void 0);

    _defineProperty(this, "tmpDistances", void 0);

    // Number of cluster centroids.
    this.k = opts.k; // one distance per cluster

    this.tmpDistances = new Float32Array(this.k); // Points to cluster.

    this.data = opts.data; // Keeps track of which cluster centroid index each data point belongs to.
    // each point gets assigned to one cluster (an int between 0 and k-1)

    this.assignments = new Int32Array(this.data.length / 3); // Get the extents (min,max) for the dimensions.

    this.extents = this.dataDimensionExtents(this.data); // Get the range of the dimensions.

    this.ranges = this.dataExtentRanges(); // Generate random cluster centroid points.

    this.means = KMeans.randomSeeds(this.k, this.data); // Keep track of number of times centroids move.

    this.iterations = 0; // Delay for each draw iteration.

    this.drawDelay = 1; // Perform work.

    this.timer = -1;
    this.run();
  }
  /**
   * dataDimensionExtents
   * @desc Returns the the minimum and maximum values for each dimention in the data array.
   * @param {array} data - data containing points
   * @return {array} extents - min and max extents minx,miny,minz,maxx,maxy,maxz
   * @example
   * kmeans.data = [
   *   2,5,1,
   *   4,7,2,
   *   3,1,3
   * ];
   * var extents = kmeans.dataDimensionExtents();
   * console.log(extents); // [2,1,1, 4,7,3]
   */


  _createClass(KMeans, [{
    key: "dataDimensionExtents",
    value: function dataDimensionExtents(data) {
      //data = data || this.data;
      var extents = [1000000, 1000000, 1000000, -1000000, -1000000, -1000000];

      for (var i = 0; i < data.length / 3; i++) {
        var x = data[i * 3];
        var y = data[i * 3 + 1];
        var z = data[i * 3 + 2];

        if (x < extents[0]) {
          extents[0] = x;
        }

        if (x > extents[3]) {
          extents[3] = x;
        }

        if (y < extents[1]) {
          extents[1] = y;
        }

        if (y > extents[4]) {
          extents[4] = y;
        }

        if (z < extents[2]) {
          extents[2] = z;
        }

        if (z > extents[5]) {
          extents[5] = z;
        }
      }

      return extents;
    }
    /**
     * dataExtentRanges
     * @desc Returns the range for each extent
     * @return {array} ranges
     * kmeans.extents = [minx,miny.minz,maxx,maxy,maxz]
     * var ranges = kmeans.dataExtentRanges(extents);
     * console.log(ranges); // [2,6]
     */

  }, {
    key: "dataExtentRanges",
    value: function dataExtentRanges() {
      return [this.extents[3] - this.extents[0], this.extents[4] - this.extents[1], this.extents[5] - this.extents[2]];
    }
    /**
     * seeds
     * @desc Returns an array of randomly generated cluster centroid points bounds based on the data dimension ranges.
     * @return {array} cluster centroid points
     * @example
     * var means = kmeans.seeds();
     * console.log(means); // [2,3,7, 4,5,2, 5,2,1]
     */

  }, {
    key: "seeds",
    value: function seeds() {
      var means = new Float32Array(this.k * 3);

      for (var i = 0; i < this.k; ++i) {
        means[i * 3] = this.extents[0] + Math.random() * this.ranges[0];
        means[i * 3 + 1] = this.extents[1] + Math.random() * this.ranges[1];
        means[i * 3 + 2] = this.extents[2] + Math.random() * this.ranges[2];
      }

      return means;
    }
  }, {
    key: "assignClusterToDataPoints",

    /**
     * assignClusterToDataPoints
     * @desc Calculate Euclidean distance between each point and the cluster center.
     * Assigns each point to closest mean point.
     *
     * The distance between two points is the length of the path connecting them.
     * The distance between points P(p1,p2) and Q(q1,q2) is given by the Pythagorean theorem.
     *
     * distance = square root of ((p1 - q1)^2 + (p2 - q2)^2)
     *
     * For n dimensions, ie P(p1,p2,pn) and Q(q1,q2,qn).
     * d(p,q) = square root of ((p1 - q1)^2 + (p2 - q2)^2 + ... + (pn - qn)^2)
     *
     * http://en.wikipedia.org/wiki/Euclidean_distance
     */
    value: function assignClusterToDataPoints() {
      for (var i = 0; i < this.data.length / 3; i++) {
        var x = this.data[i * 3];
        var y = this.data[i * 3 + 1];
        var z = this.data[i * 3 + 2]; // populate distance from point i to cluster j for all j.

        for (var j = 0; j < this.means.length / 3; j++) {
          var mx = this.means[j * 3];
          var my = this.means[j * 3 + 1];
          var mz = this.means[j * 3 + 2];
          /* We calculate the Euclidean distance.
           * √((pi-qi)^2+...+(pn-qn)^2)
           */

          var sum = (x - mx) * (x - mx) + (y - my) * (y - my) + (z - mz) * (z - mz); // √sum

          this.tmpDistances[j] = Math.sqrt(sum);
        } // After calculating all the distances from the data point to each cluster centroid,
        // we pick the closest (smallest) distances.


        var minReading = findMin(this.tmpDistances);
        this.assignments[i] = this.tmpDistances.indexOf(minReading);
      }
    }
    /**
     * moveMeans
     * @desc Update the positions of the the cluster centroids (means) to the average positions
     * of all data points that belong to that mean.
     */

  }, {
    key: "moveMeans",
    value: function moveMeans() {
      // sums are 3d points
      var sums = new Float32Array(this.means.length).fill(0);
      var counts = new Int32Array(this.means.length / 3).fill(0);
      var moved = false;
      var meanIndex;
      var dim; // For each cluster, get sum of point coordinates in every dimension.

      for (var pointIndex = 0; pointIndex < this.assignments.length; pointIndex++) {
        meanIndex = this.assignments[pointIndex];
        var px = this.data[pointIndex * 3];
        var py = this.data[pointIndex * 3 + 1];
        var pz = this.data[pointIndex * 3 + 2];
        counts[meanIndex]++;
        sums[meanIndex * 3] += px;
        sums[meanIndex * 3 + 1] += py;
        sums[meanIndex * 3 + 2] += pz;
      }
      /* If cluster centroid (mean) is not longer assigned to any points,
       * move it somewhere else randomly within range of points.
       */


      for (meanIndex = 0; meanIndex < sums.length / 3; meanIndex++) {
        if (0 === counts[meanIndex]) {
          sums[meanIndex * 3] = this.extents[0] + Math.random() * this.ranges[0];
          sums[meanIndex * 3 + 1] = this.extents[1] + Math.random() * this.ranges[1];
          sums[meanIndex * 3 + 2] = this.extents[2] + Math.random() * this.ranges[2];
          continue;
        }

        sums[meanIndex * 3] /= counts[meanIndex];
        sums[meanIndex * 3] = Math.round(100 * sums[meanIndex * 3]) / 100;
        sums[meanIndex * 3 + 1] /= counts[meanIndex];
        sums[meanIndex * 3 + 1] = Math.round(100 * sums[meanIndex * 3 + 1]) / 100;
        sums[meanIndex * 3 + 2] /= counts[meanIndex];
        sums[meanIndex * 3 + 2] = Math.round(100 * sums[meanIndex * 3 + 2]) / 100;
      }
      /* If current means does not equal to new means, then
       * move cluster centroid closer to average point.
       */
      // compare ALL the means to the sums.


      if (!areArraysClose(this.means, sums, 0.01)) {
        var diff;
        moved = true; // Nudge means 1/nth of the way toward average point.

        for (meanIndex = 0; meanIndex < sums.length / 3; meanIndex++) {
          for (dim = 0; dim < 3; dim++) {
            diff = sums[meanIndex * 3 + dim] - this.means[meanIndex * 3 + dim];

            if (Math.abs(diff) > 0.1) {
              var stepsPerIteration = 10;
              this.means[meanIndex * 3 + dim] += diff / stepsPerIteration;
              this.means[meanIndex * 3 + dim] = Math.round(100 * this.means[meanIndex * 3 + dim]) / 100;
            } else {
              this.means[meanIndex * 3 + dim] = sums[meanIndex * 3 + dim];
            }
          }
        }
      }

      return moved;
    }
    /**
     * run
     * @desc Reassigns nearest cluster centroids (means) to data points,
     * and checks if cluster centroids (means) have moved, otherwise
     * end program.
     */

  }, {
    key: "run",
    value: function run() {
      var meansMoved = true; // tune this value for performance vs quality

      var maxIterations = 150; // no kmeans call should take more than this amount of time

      var timeLimitMs = 5000;
      var startTimeMs = Date.now();
      var time = 0;

      do {
        ++this.iterations; // Reassign points to nearest cluster centroids.

        this.assignClusterToDataPoints(); // Returns true if the cluster centroids have moved location since the last iteration.

        meansMoved = this.moveMeans();
        time = Date.now() - startTimeMs;
      } while (meansMoved && this.iterations < maxIterations && !(time > timeLimitMs));
    }
  }], [{
    key: "randomSeeds",
    value: function randomSeeds(k, data) {
      // choose k random items from the original data set
      var numItems = data.length / 3;
      var selected = new Set();

      while (selected.add(Math.floor(Math.random() * numItems) | 0).size < k) {}

      var items = _toConsumableArray(selected);

      var means = new Float32Array(k * 3);

      for (var i = 0; i < k; ++i) {
        // select a random point from our initial set
        means[i * 3] = data[items[i] * 3];
        means[i * 3 + 1] = data[items[i] * 3 + 1];
        means[i * 3 + 2] = data[items[i] * 3 + 2];
      }

      return means;
    }
  }]);

  return KMeans;
}();

export { KMeans as default };