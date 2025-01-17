import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { NetMessageEnum } from "./WebsocketClient.js";
export var OctopusServicesClient = /*#__PURE__*/function () {
  function OctopusServicesClient(webSocketClient) {
    _classCallCheck(this, OctopusServicesClient);
    _defineProperty(this, "webSocketClient", void 0);
    _defineProperty(this, "lastRequestedFile", "");
    _defineProperty(this, "healthCheckHandler", void 0);
    this.webSocketClient = webSocketClient;
    this.healthCheckHandler = function () {
      /* do nothing */
    };
  }
  return _createClass(OctopusServicesClient, [{
    key: "setHealthCheckHandler",
    value: function setHealthCheckHandler(handler) {
      var _this = this;
      this.healthCheckHandler = handler;
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_SERVER_HEALTHY_RESPONSE, function () {
        return _this.healthCheckHandler();
      });
    }
  }, {
    key: "connectToRemoteServer",
    value: function () {
      var _connectToRemoteServer = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", this.webSocketClient.connectToRemoteServer());
            case 1:
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
    key: "convertTrajectory",
    value: function () {
      var _convertTrajectory = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime.mark(function _callee2(dataToConvert, fileType, fileName) {
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              this.lastRequestedFile = fileName;
              this.webSocketClient.sendWebSocketRequest({
                msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                trajType: fileType.toLowerCase(),
                fileName: fileName,
                data: dataToConvert
              }, "Convert trajectory output to simularium file format");
            case 2:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function convertTrajectory(_x, _x2, _x3) {
        return _convertTrajectory.apply(this, arguments);
      }
      return convertTrajectory;
    }()
  }, {
    key: "cancelConversion",
    value: function cancelConversion() {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_CANCEL_CONVERSION,
        fileName: this.lastRequestedFile
      }, "Cancel the requested autoconversion");
      this.lastRequestedFile = "";
    }
  }, {
    key: "checkServerHealth",
    value: function () {
      var _checkServerHealth = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return this.webSocketClient.connectToRemoteServer();
            case 2:
              this.webSocketClient.sendWebSocketRequest({
                msgType: NetMessageEnum.ID_CHECK_HEALTH_REQUEST
              }, "Request server health check");
            case 3:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function checkServerHealth() {
        return _checkServerHealth.apply(this, arguments);
      }
      return checkServerHealth;
    }()
  }]);
}();