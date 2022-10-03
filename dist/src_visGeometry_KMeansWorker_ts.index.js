/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["simularium-viewer"] = factory();
	else
		root["simularium-viewer"] = factory();
})(self, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/visGeometry/KMeansWorker.ts":
/*!*****************************************!*\
  !*** ./src/visGeometry/KMeansWorker.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ \"./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js\");\n/* harmony import */ var _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ \"./node_modules/@babel/runtime/helpers/esm/classCallCheck.js\");\n/* harmony import */ var _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/createClass */ \"./node_modules/@babel/runtime/helpers/esm/createClass.js\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/regenerator */ \"./node_modules/@babel/runtime/regenerator/index.js\");\n/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var regenerator_runtime_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! regenerator-runtime/runtime */ \"./node_modules/regenerator-runtime/runtime.js\");\n/* harmony import */ var regenerator_runtime_runtime__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(regenerator_runtime_runtime__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! comlink */ \"./node_modules/comlink/dist/esm/comlink.mjs\");\n/* harmony import */ var _rendering_KMeans3d__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./rendering/KMeans3d */ \"./src/visGeometry/rendering/KMeans3d.ts\");\n\n\n\n\n\n\n\n\nvar KMeansWorker = /*#__PURE__*/function () {\n  function KMeansWorker() {\n    (0,_babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__[\"default\"])(this, KMeansWorker);\n  }\n\n  (0,_babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__[\"default\"])(KMeansWorker, [{\n    key: \"run\",\n    value: function () {\n      var _run = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_0__[\"default\"])( /*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3___default().mark(function _callee(k, sizes, data) {\n        var results, i, km3;\n        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_3___default().wrap(function _callee$(_context) {\n          while (1) {\n            switch (_context.prev = _context.next) {\n              case 0:\n                results = [];\n\n                for (i = 0; i < sizes.length; ++i) {\n                  km3 = new _rendering_KMeans3d__WEBPACK_IMPORTED_MODULE_5__[\"default\"]({\n                    k: sizes[i],\n                    data: data\n                  });\n                  results.push(km3.means);\n                }\n\n                return _context.abrupt(\"return\", results);\n\n              case 3:\n              case \"end\":\n                return _context.stop();\n            }\n          }\n        }, _callee);\n      }));\n\n      function run(_x, _x2, _x3) {\n        return _run.apply(this, arguments);\n      }\n\n      return run;\n    }()\n  }]);\n\n  return KMeansWorker;\n}();\n\ncomlink__WEBPACK_IMPORTED_MODULE_6__.expose(KMeansWorker);\n\n//# sourceURL=webpack://simularium-viewer/./src/visGeometry/KMeansWorker.ts?");

/***/ }),

/***/ "./src/visGeometry/rendering/KMeans3d.ts":
/*!***********************************************!*\
  !*** ./src/visGeometry/rendering/KMeans3d.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ KMeans)\n/* harmony export */ });\n/* harmony import */ var _babel_runtime_helpers_toConsumableArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/toConsumableArray */ \"./node_modules/@babel/runtime/helpers/esm/toConsumableArray.js\");\n/* harmony import */ var _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ \"./node_modules/@babel/runtime/helpers/esm/classCallCheck.js\");\n/* harmony import */ var _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/createClass */ \"./node_modules/@babel/runtime/helpers/esm/createClass.js\");\n/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ \"./node_modules/@babel/runtime/helpers/esm/defineProperty.js\");\n\n\n\n\n\n// assumes arrays of equal length\nfunction areArraysClose(a, b, epsilon) {\n  for (var i = 0; i < a.length; ++i) {\n    if (Math.abs(a[i] - b[i]) > epsilon) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\nfunction findMin(arr) {\n  var m = Number.MAX_VALUE;\n\n  for (var i = 0; i < arr.length; ++i) {\n    if (arr[i] < m) {\n      m = arr[i];\n    }\n  }\n\n  return m;\n}\n/**\n * KMeans\n *       This is a ported and optimized version of code explained here:\n *       https://miguelmota.com/blog/k-means-clustering-in-javascript/\n *       https://burakkanber.com/blog/machine-learning-k-means-clustering-in-javascript-part-1/\n *\n * @constructor\n * @desc KMeans constructor\n * @param {object} options - options object\n * @param {array} options.data - data array with points\n * @param {number} options.k - number of cluster centroids\n * @return array with arrays of points\n */\n\n\nvar KMeans = /*#__PURE__*/function () {\n  function KMeans(opts) {\n    (0,_babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_1__[\"default\"])(this, KMeans);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"k\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"data\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"assignments\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"extents\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"ranges\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"means\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"iterations\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"drawDelay\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"timer\", void 0);\n\n    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_3__[\"default\"])(this, \"tmpDistances\", void 0);\n\n    // Number of cluster centroids.\n    this.k = opts.k; // one distance per cluster\n\n    this.tmpDistances = new Float32Array(this.k); // Points to cluster.\n\n    this.data = opts.data; // Keeps track of which cluster centroid index each data point belongs to.\n    // each point gets assigned to one cluster (an int between 0 and k-1)\n\n    this.assignments = new Int32Array(this.data.length / 3); // Get the extents (min,max) for the dimensions.\n\n    this.extents = this.dataDimensionExtents(this.data); // Get the range of the dimensions.\n\n    this.ranges = this.dataExtentRanges(); // Generate random cluster centroid points.\n\n    this.means = KMeans.randomSeeds(this.k, this.data); // Keep track of number of times centroids move.\n\n    this.iterations = 0; // Delay for each draw iteration.\n\n    this.drawDelay = 1; // Perform work.\n\n    this.timer = -1;\n    this.run();\n  }\n  /**\n   * dataDimensionExtents\n   * @desc Returns the the minimum and maximum values for each dimention in the data array.\n   * @param {array} data - data containing points\n   * @return {array} extents - min and max extents minx,miny,minz,maxx,maxy,maxz\n   * @example\n   * kmeans.data = [\n   *   2,5,1,\n   *   4,7,2,\n   *   3,1,3\n   * ];\n   * var extents = kmeans.dataDimensionExtents();\n   * console.log(extents); // [2,1,1, 4,7,3]\n   */\n\n\n  (0,_babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_2__[\"default\"])(KMeans, [{\n    key: \"dataDimensionExtents\",\n    value: function dataDimensionExtents(data) {\n      //data = data || this.data;\n      var extents = [1000000, 1000000, 1000000, -1000000, -1000000, -1000000];\n\n      for (var i = 0; i < data.length / 3; i++) {\n        var x = data[i * 3];\n        var y = data[i * 3 + 1];\n        var z = data[i * 3 + 2];\n\n        if (x < extents[0]) {\n          extents[0] = x;\n        }\n\n        if (x > extents[3]) {\n          extents[3] = x;\n        }\n\n        if (y < extents[1]) {\n          extents[1] = y;\n        }\n\n        if (y > extents[4]) {\n          extents[4] = y;\n        }\n\n        if (z < extents[2]) {\n          extents[2] = z;\n        }\n\n        if (z > extents[5]) {\n          extents[5] = z;\n        }\n      }\n\n      return extents;\n    }\n    /**\n     * dataExtentRanges\n     * @desc Returns the range for each extent\n     * @return {array} ranges\n     * kmeans.extents = [minx,miny.minz,maxx,maxy,maxz]\n     * var ranges = kmeans.dataExtentRanges(extents);\n     * console.log(ranges); // [2,6]\n     */\n\n  }, {\n    key: \"dataExtentRanges\",\n    value: function dataExtentRanges() {\n      return [this.extents[3] - this.extents[0], this.extents[4] - this.extents[1], this.extents[5] - this.extents[2]];\n    }\n    /**\n     * seeds\n     * @desc Returns an array of randomly generated cluster centroid points bounds based on the data dimension ranges.\n     * @return {array} cluster centroid points\n     * @example\n     * var means = kmeans.seeds();\n     * console.log(means); // [2,3,7, 4,5,2, 5,2,1]\n     */\n\n  }, {\n    key: \"seeds\",\n    value: function seeds() {\n      var means = new Float32Array(this.k * 3);\n\n      for (var i = 0; i < this.k; ++i) {\n        means[i * 3] = this.extents[0] + Math.random() * this.ranges[0];\n        means[i * 3 + 1] = this.extents[1] + Math.random() * this.ranges[1];\n        means[i * 3 + 2] = this.extents[2] + Math.random() * this.ranges[2];\n      }\n\n      return means;\n    }\n  }, {\n    key: \"assignClusterToDataPoints\",\n    value:\n    /**\n     * assignClusterToDataPoints\n     * @desc Calculate Euclidean distance between each point and the cluster center.\n     * Assigns each point to closest mean point.\n     *\n     * The distance between two points is the length of the path connecting them.\n     * The distance between points P(p1,p2) and Q(q1,q2) is given by the Pythagorean theorem.\n     *\n     * distance = square root of ((p1 - q1)^2 + (p2 - q2)^2)\n     *\n     * For n dimensions, ie P(p1,p2,pn) and Q(q1,q2,qn).\n     * d(p,q) = square root of ((p1 - q1)^2 + (p2 - q2)^2 + ... + (pn - qn)^2)\n     *\n     * http://en.wikipedia.org/wiki/Euclidean_distance\n     */\n    function assignClusterToDataPoints() {\n      for (var i = 0; i < this.data.length / 3; i++) {\n        var x = this.data[i * 3];\n        var y = this.data[i * 3 + 1];\n        var z = this.data[i * 3 + 2]; // populate distance from point i to cluster j for all j.\n\n        for (var j = 0; j < this.means.length / 3; j++) {\n          var mx = this.means[j * 3];\n          var my = this.means[j * 3 + 1];\n          var mz = this.means[j * 3 + 2];\n          /* We calculate the Euclidean distance.\n           * √((pi-qi)^2+...+(pn-qn)^2)\n           */\n\n          var sum = (x - mx) * (x - mx) + (y - my) * (y - my) + (z - mz) * (z - mz); // √sum\n\n          this.tmpDistances[j] = Math.sqrt(sum);\n        } // After calculating all the distances from the data point to each cluster centroid,\n        // we pick the closest (smallest) distances.\n\n\n        var minReading = findMin(this.tmpDistances);\n        this.assignments[i] = this.tmpDistances.indexOf(minReading);\n      }\n    }\n    /**\n     * moveMeans\n     * @desc Update the positions of the the cluster centroids (means) to the average positions\n     * of all data points that belong to that mean.\n     */\n\n  }, {\n    key: \"moveMeans\",\n    value: function moveMeans() {\n      // sums are 3d points\n      var sums = new Float32Array(this.means.length).fill(0);\n      var counts = new Int32Array(this.means.length / 3).fill(0);\n      var moved = false;\n      var meanIndex;\n      var dim; // For each cluster, get sum of point coordinates in every dimension.\n\n      for (var pointIndex = 0; pointIndex < this.assignments.length; pointIndex++) {\n        meanIndex = this.assignments[pointIndex];\n        var px = this.data[pointIndex * 3];\n        var py = this.data[pointIndex * 3 + 1];\n        var pz = this.data[pointIndex * 3 + 2];\n        counts[meanIndex]++;\n        sums[meanIndex * 3] += px;\n        sums[meanIndex * 3 + 1] += py;\n        sums[meanIndex * 3 + 2] += pz;\n      }\n      /* If cluster centroid (mean) is not longer assigned to any points,\n       * move it somewhere else randomly within range of points.\n       */\n\n\n      for (meanIndex = 0; meanIndex < sums.length / 3; meanIndex++) {\n        if (0 === counts[meanIndex]) {\n          sums[meanIndex * 3] = this.extents[0] + Math.random() * this.ranges[0];\n          sums[meanIndex * 3 + 1] = this.extents[1] + Math.random() * this.ranges[1];\n          sums[meanIndex * 3 + 2] = this.extents[2] + Math.random() * this.ranges[2];\n          continue;\n        }\n\n        sums[meanIndex * 3] /= counts[meanIndex];\n        sums[meanIndex * 3] = Math.round(100 * sums[meanIndex * 3]) / 100;\n        sums[meanIndex * 3 + 1] /= counts[meanIndex];\n        sums[meanIndex * 3 + 1] = Math.round(100 * sums[meanIndex * 3 + 1]) / 100;\n        sums[meanIndex * 3 + 2] /= counts[meanIndex];\n        sums[meanIndex * 3 + 2] = Math.round(100 * sums[meanIndex * 3 + 2]) / 100;\n      }\n      /* If current means does not equal to new means, then\n       * move cluster centroid closer to average point.\n       */\n      // compare ALL the means to the sums.\n\n\n      if (!areArraysClose(this.means, sums, 0.01)) {\n        var diff;\n        moved = true; // Nudge means 1/nth of the way toward average point.\n\n        for (meanIndex = 0; meanIndex < sums.length / 3; meanIndex++) {\n          for (dim = 0; dim < 3; dim++) {\n            diff = sums[meanIndex * 3 + dim] - this.means[meanIndex * 3 + dim];\n\n            if (Math.abs(diff) > 0.1) {\n              var stepsPerIteration = 10;\n              this.means[meanIndex * 3 + dim] += diff / stepsPerIteration;\n              this.means[meanIndex * 3 + dim] = Math.round(100 * this.means[meanIndex * 3 + dim]) / 100;\n            } else {\n              this.means[meanIndex * 3 + dim] = sums[meanIndex * 3 + dim];\n            }\n          }\n        }\n      }\n\n      return moved;\n    }\n    /**\n     * run\n     * @desc Reassigns nearest cluster centroids (means) to data points,\n     * and checks if cluster centroids (means) have moved, otherwise\n     * end program.\n     */\n\n  }, {\n    key: \"run\",\n    value: function run() {\n      var meansMoved = true; // tune this value for performance vs quality\n\n      var maxIterations = 150; // no kmeans call should take more than this amount of time\n\n      var timeLimitMs = 5000;\n      var startTimeMs = Date.now();\n      var time = 0;\n\n      do {\n        ++this.iterations; // Reassign points to nearest cluster centroids.\n\n        this.assignClusterToDataPoints(); // Returns true if the cluster centroids have moved location since the last iteration.\n\n        meansMoved = this.moveMeans();\n        time = Date.now() - startTimeMs;\n      } while (meansMoved && this.iterations < maxIterations && !(time > timeLimitMs));\n    }\n  }], [{\n    key: \"randomSeeds\",\n    value: function randomSeeds(k, data) {\n      // choose k random items from the original data set\n      var numItems = data.length / 3;\n      var selected = new Set();\n\n      while (selected.add(Math.floor(Math.random() * numItems) | 0).size < k) {}\n\n      var items = (0,_babel_runtime_helpers_toConsumableArray__WEBPACK_IMPORTED_MODULE_0__[\"default\"])(selected);\n\n      var means = new Float32Array(k * 3);\n\n      for (var i = 0; i < k; ++i) {\n        // select a random point from our initial set\n        means[i * 3] = data[items[i] * 3];\n        means[i * 3 + 1] = data[items[i] * 3 + 1];\n        means[i * 3 + 2] = data[items[i] * 3 + 2];\n      }\n\n      return means;\n    }\n  }]);\n\n  return KMeans;\n}();\n\n\n\n//# sourceURL=webpack://simularium-viewer/./src/visGeometry/rendering/KMeans3d.ts?");

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
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_babel_runtime_regenerator_index_js-node_modules_babel_runtime_helpers_es-95eaa1"], () => (__webpack_require__("./src/visGeometry/KMeansWorker.ts")))
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
/******/ 			"src_visGeometry_KMeansWorker_ts": 1
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
/******/ 		var chunkLoadingGlobal = self["webpackChunksimularium_viewer"] = self["webpackChunksimularium_viewer"] || [];
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
/******/ 	return __webpack_exports__;
/******/ })()
;
});