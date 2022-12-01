import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import "regenerator-runtime/runtime";
import * as Comlink from "comlink";
import KMeans3d from "../rendering/KMeans3d";

var KMeansWorker = /*#__PURE__*/function () {
  function KMeansWorker() {
    _classCallCheck(this, KMeansWorker);
  }

  _createClass(KMeansWorker, [{
    key: "run",
    value: function () {
      var _run = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(k, sizes, data) {
        var results, i, km3;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                results = [];

                for (i = 0; i < sizes.length; ++i) {
                  km3 = new KMeans3d({
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