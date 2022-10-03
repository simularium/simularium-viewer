"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.Orchestrator = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var Orchestrator = /*#__PURE__*/function () {
  function Orchestrator(params) {
    (0, _classCallCheck2["default"])(this, Orchestrator);
    (0, _defineProperty2["default"])(this, "serviceAddr", void 0);
    this.serviceAddr = params.serviceAddr || "https://localhost:5000";
  }

  (0, _createClass2["default"])(Orchestrator, [{
    key: "getNodes",
    value: function getNodes(params) {
      var nodeFetch = fetch(this.serviceAddr + "/get?" + params);
      return nodeFetch.then(function (response) {
        if (response.ok) {
          return response.json().then(function (data) {
            return Object.keys(data).length > 0 ? data : undefined;
          });
        } else {
          return undefined;
        }
      })["catch"](function () {
        return undefined;
      });
    }
  }, {
    key: "getFreeNodes",
    value: function getFreeNodes() {
      var params = "state=free";
      return this.getNodes(params);
    }
  }, {
    key: "getSimNode",
    value: function getSimNode(simId) {
      var params = "simulation=" + simId;
      return this.getNodes(params);
    }
  }, {
    key: "reserveNode",
    value: function reserveNode(config, simulation) {
      fetch(this.serviceAddr + "/assign" + "?command=reserve" + "&simulation=" + simulation + "&name=" + config.name);
    }
  }, {
    key: "freeNode",
    value: function freeNode(config) {
      fetch(this.serviceAddr + "/assign?" + "command=free" + "&name=" + config.name);
    }
  }]);
  return Orchestrator;
}();

exports.Orchestrator = exports["default"] = Orchestrator;