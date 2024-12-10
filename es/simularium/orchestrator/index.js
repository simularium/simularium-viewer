import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
var Orchestrator = /*#__PURE__*/function () {
  function Orchestrator(params) {
    _classCallCheck(this, Orchestrator);
    _defineProperty(this, "serviceAddr", void 0);
    this.serviceAddr = params.serviceAddr || "https://localhost:5000";
  }
  return _createClass(Orchestrator, [{
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
}();
export { Orchestrator as default };
export { Orchestrator };