"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

require("regenerator-runtime/runtime");

var Comlink = _interopRequireWildcard(require("comlink"));

var _KMeans3d = _interopRequireDefault(require("./rendering/KMeans3d"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var KMeansWorker = /*#__PURE__*/function () {
  function KMeansWorker() {
    (0, _classCallCheck2["default"])(this, KMeansWorker);
  }

  (0, _createClass2["default"])(KMeansWorker, [{
    key: "run",
    value: function () {
      var _run = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(k, sizes, data) {
        var results, i, km3;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                results = [];

                for (i = 0; i < sizes.length; ++i) {
                  km3 = new _KMeans3d["default"]({
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

Comlink.expose(KMeansWorker);