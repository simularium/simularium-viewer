"use strict";

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ErrorLevel", {
  enumerable: true,
  get: function get() {
    return _simularium.ErrorLevel;
  }
});
Object.defineProperty(exports, "FrontEndError", {
  enumerable: true,
  get: function get() {
    return _simularium.FrontEndError;
  }
});
Object.defineProperty(exports, "Orchestrator", {
  enumerable: true,
  get: function get() {
    return _simularium.Orchestrator;
  }
});
Object.defineProperty(exports, "RemoteSimulator", {
  enumerable: true,
  get: function get() {
    return _simularium.RemoteSimulator;
  }
});
Object.defineProperty(exports, "RenderStyle", {
  enumerable: true,
  get: function get() {
    return _viewport.RenderStyle;
  }
});
Object.defineProperty(exports, "SimulariumController", {
  enumerable: true,
  get: function get() {
    return _controller.SimulariumController;
  }
});
Object.defineProperty(exports, "compareTimes", {
  enumerable: true,
  get: function get() {
    return _util.compareTimes;
  }
});
exports["default"] = void 0;
Object.defineProperty(exports, "loadSimulariumFile", {
  enumerable: true,
  get: function get() {
    return _util.loadSimulariumFile;
  }
});

var _viewport = _interopRequireWildcard(require("./viewport"));

var _controller = require("./controller");

var _simularium = require("./simularium");

var _util = require("./util");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var _default = _viewport["default"];
exports["default"] = _default;