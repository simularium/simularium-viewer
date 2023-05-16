import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
// Gotta set up a separate RemoteMetricsCalculator in case we have a non-remote
// simulator and want to calculate metrics anyways

import { NetMessageEnum } from "./WebsocketClient";
export var RemoteMetricsCalculator = /*#__PURE__*/function () {
  function RemoteMetricsCalculator(webSocketClient, errorHandler) {
    _classCallCheck(this, RemoteMetricsCalculator);
    _defineProperty(this, "handleError", void 0);
    _defineProperty(this, "webSocketClient", void 0);
    this.handleError = errorHandler || function () {
      /* do nothing */
    };
    this.webSocketClient = webSocketClient;
  }
  _createClass(RemoteMetricsCalculator, [{
    key: "connectToRemoteServer",
    value: function () {
      var _connectToRemoteServer = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              this.registerJsonMessageHandlers();
              return _context.abrupt("return", this.webSocketClient.connectToRemoteServer());
            case 2:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function connectToRemoteServer() {
        return _connectToRemoteServer.apply(this, arguments);
      }
      return connectToRemoteServer;
    }()
  }, {
    key: "socketIsValid",
    value: function socketIsValid() {
      return this.webSocketClient.socketIsValid();
    }
  }, {
    key: "getAvailableMetrics",
    value: function getAvailableMetrics() {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_AVAILABLE_METRICS_REQUEST
      }, "Request available metrics from the metrics service");
    }
  }, {
    key: "getPlotData",
    value: function getPlotData(data, plots, fileName) {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_PLOT_DATA_REQUEST,
        fileName: fileName,
        data: data,
        plots: plots
      }, "Request plot data for a given trajectory and plot types");
    }
  }, {
    key: "onAvailableMetricsArrive",
    value: function onAvailableMetricsArrive(msg) {
      // TODO: implement callback
      console.log("Available metrics: ", msg["metrics"]);
    }
  }, {
    key: "onPlotDataArrive",
    value: function onPlotDataArrive(msg) {
      // TODO: implement callback
      console.log("Plot data: ", msg["plotData"]);
    }
  }, {
    key: "registerJsonMessageHandlers",
    value: function registerJsonMessageHandlers() {
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_AVAILABLE_METRICS_RESPONSE, this.onAvailableMetricsArrive);
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_PLOT_DATA_RESPONSE, this.onPlotDataArrive);
    }
  }]);
  return RemoteMetricsCalculator;
}();