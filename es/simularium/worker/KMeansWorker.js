function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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
      var _run = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(k, sizes, data) {
        var results, i, km3;
        return regeneratorRuntime.wrap(function _callee$(_context) {
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

Comlink.expose(KMeansWorker); // I know of no other way to deal with this, see the documentation for webpack's worker-loader.
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export default self;