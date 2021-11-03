/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/simularium/VisGeometry/KMeansWorker.ts":
/*!****************************************************!*\
  !*** ./src/simularium/VisGeometry/KMeansWorker.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js");
/* harmony import */ var _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "./node_modules/@babel/runtime/helpers/esm/classCallCheck.js");
/* harmony import */ var _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/createClass */ "./node_modules/@babel/runtime/helpers/esm/createClass.js");
/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/regenerator */ "./node_modules/@babel/runtime/regenerator/index.js");
/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var regenerator_runtime_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! regenerator-runtime/runtime */ "./node_modules/regenerator-runtime/runtime.js");
/* harmony import */ var regenerator_runtime_runtime__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(regenerator_runtime_runtime__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! comlink */ "./node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _rendering_KMeans3d__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./rendering/KMeans3d */ "./src/simularium/VisGeometry/rendering/KMeans3d.ts");








var KMeansWorker = /*#__PURE__*/function () {
  function KMeansWorker() {
    (0,_babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__.default)(this, KMeansWorker);
  }

  (0,_babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__.default)(KMeansWorker, [{
    key: "run",
    value: function () {
      var _run = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_0__.default)( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3___default().mark(function _callee(k, sizes, data) {
        var results, i, km3;
        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3___default().wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                results = [];

                for (i = 0; i < sizes.length; ++i) {
                  km3 = new _rendering_KMeans3d__WEBPACK_IMPORTED_MODULE_5__.default({
                    k: sizes[i],
                    data: data
                  });
                  results.push(km3.means);
                }

                return _context.abrupt("return", results);

              case 3:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function run(_x, _x2, _x3) {
        return _run.apply(this, arguments);
      }

      return run;
    }()
  }]);

  return KMeansWorker;
}();

comlink__WEBPACK_IMPORTED_MODULE_6__.expose(KMeansWorker);

/***/ }),

/***/ "./src/simularium/VisGeometry/rendering/KMeans3d.ts":
/*!**********************************************************!*\
  !*** ./src/simularium/VisGeometry/rendering/KMeans3d.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ KMeans)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_toConsumableArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/toConsumableArray */ "./node_modules/@babel/runtime/helpers/esm/toConsumableArray.js");
/* harmony import */ var _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "./node_modules/@babel/runtime/helpers/esm/classCallCheck.js");
/* harmony import */ var _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/createClass */ "./node_modules/@babel/runtime/helpers/esm/createClass.js");
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "./node_modules/@babel/runtime/helpers/esm/defineProperty.js");





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
    (0,_babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__.default)(this, KMeans);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "k", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "data", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "assignments", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "extents", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "ranges", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "means", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "iterations", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "drawDelay", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "timer", void 0);

    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__.default)(this, "tmpDistances", void 0);

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


  (0,_babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__.default)(KMeans, [{
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
    value:
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
    function assignClusterToDataPoints() {
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

      var items = (0,_babel_runtime_helpers_toConsumableArray__WEBPACK_IMPORTED_MODULE_0__.default)(selected);

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



/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_babel_runtime_regenerator_index_js-node_modules_babel_runtime_helpers_es-95eaa1"], () => (__webpack_require__("./src/simularium/VisGeometry/KMeansWorker.ts")))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".index.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference all chunks
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) scriptUrl = scripts[scripts.length - 1].src
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			"src_simularium_VisGeometry_KMeansWorker_ts": 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk_aics_simularium_viewer"] = self["webpackChunk_aics_simularium_viewer"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			return __webpack_require__.e("vendors-node_modules_babel_runtime_regenerator_index_js-node_modules_babel_runtime_helpers_es-95eaa1").then(next);
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ })()
;
//# sourceMappingURL=src_simularium_VisGeometry_KMeansWorker_ts.index.js.map