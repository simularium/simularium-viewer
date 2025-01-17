import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import jsLogger from "js-logger";
import { FrontEndError, ErrorLevel } from "./FrontEndError.js";
import { NetMessageEnum } from "./WebsocketClient.js";
// a RemoteSimulator is a ISimulator that connects to the Octopus backend server
// and plays back a trajectory specified in the NetConnectionParams
export var RemoteSimulator = /*#__PURE__*/function () {
  function RemoteSimulator(webSocketClient, errorHandler) {
    _classCallCheck(this, RemoteSimulator);
    _defineProperty(this, "webSocketClient", void 0);
    _defineProperty(this, "logger", void 0);
    _defineProperty(this, "onTrajectoryFileInfoArrive", void 0);
    _defineProperty(this, "onTrajectoryDataArrive", void 0);
    _defineProperty(this, "lastRequestedFile", void 0);
    _defineProperty(this, "handleError", void 0);
    this.webSocketClient = webSocketClient;
    this.lastRequestedFile = "";
    this.handleError = errorHandler || function () {
      /* do nothing */
    };
    this.logger = jsLogger.get("netconnection");
    this.logger.setLevel(jsLogger.DEBUG);
    this.registerBinaryMessageHandlers();
    this.registerJsonMessageHandlers();
    this.onTrajectoryFileInfoArrive = function () {
      /* do nothing */
    };
    this.onTrajectoryDataArrive = function () {
      /* do nothing */
    };
  }
  return _createClass(RemoteSimulator, [{
    key: "setTrajectoryFileInfoHandler",
    value: function setTrajectoryFileInfoHandler(handler) {
      this.onTrajectoryFileInfoArrive = handler;
    }
  }, {
    key: "setTrajectoryDataHandler",
    value: function setTrajectoryDataHandler(handler) {
      this.onTrajectoryDataArrive = handler;
    }
  }, {
    key: "setErrorHandler",
    value: function setErrorHandler(handler) {
      this.handleError = handler;
    }
  }, {
    key: "socketIsValid",
    value: function socketIsValid() {
      return this.webSocketClient.socketIsValid();
    }
  }, {
    key: "getLastRequestedFile",
    value: function getLastRequestedFile() {
      return this.lastRequestedFile;
    }

    /**
     *   Websocket Message Handlers
     * */
  }, {
    key: "onBinaryIdVisDataArrive",
    value: function onBinaryIdVisDataArrive(event) {
      var OFFSET_TO_NAME_LENGTH = 8;
      var floatView = new Float32Array(event.data);
      var nameLength = floatView[1];
      var byteView = new Uint8Array(event.data);
      var fileBytes = byteView.subarray(OFFSET_TO_NAME_LENGTH, OFFSET_TO_NAME_LENGTH + nameLength);
      var fileName = new TextDecoder("utf-8").decode(fileBytes);
      if (fileName == this.lastRequestedFile) {
        this.onTrajectoryDataArrive(event.data);
      } else {
        this.logger.error("File arrived ", fileName, " is not file ", this.lastRequestedFile);
      }
    }
  }, {
    key: "onHeartbeatPing",
    value: function onHeartbeatPing(msg) {
      this.webSocketClient.sendWebSocketRequest({
        connId: msg.connId,
        msgType: NetMessageEnum.ID_HEARTBEAT_PONG
      }, "Heartbeat pong");
    }
  }, {
    key: "onJsonIdVisDataArrive",
    value: function onJsonIdVisDataArrive(msg) {
      if (msg.fileName === this.lastRequestedFile) {
        this.onTrajectoryDataArrive(msg);
      }
    }
  }, {
    key: "updateTimestep",
    value: function updateTimestep() {
      this.logger.debug("Update Timestep Message Arrived");
      // TODO: implement callback
    }
  }, {
    key: "updateRateParam",
    value: function updateRateParam() {
      this.logger.debug("Update Rate Param Message Arrived");
      // TODO: implement callback
    }
  }, {
    key: "onModelDefinitionArrive",
    value: function onModelDefinitionArrive() {
      this.logger.debug("Model Definition Arrived");
      // TODO: implement callback
    }
  }, {
    key: "onErrorMsg",
    value: function onErrorMsg(msg) {
      this.logger.error("Error message of type ", msg.errorCode, " arrived: ", msg.errorMsg);
      var error = new FrontEndError(msg.errorMsg, ErrorLevel.WARNING);
      this.handleError(error);
      // TODO: specific handling based on error code
    }
  }, {
    key: "registerBinaryMessageHandlers",
    value: function registerBinaryMessageHandlers() {
      var _this = this;
      this.webSocketClient.addBinaryMessageHandler(NetMessageEnum.ID_VIS_DATA_ARRIVE, function (msg) {
        return _this.onBinaryIdVisDataArrive(msg);
      });
    }
  }, {
    key: "registerJsonMessageHandlers",
    value: function registerJsonMessageHandlers() {
      var _this2 = this;
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_TRAJECTORY_FILE_INFO, function (msg) {
        return _this2.onTrajectoryFileInfoArrive(msg);
      });
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_HEARTBEAT_PING, function (msg) {
        return _this2.onHeartbeatPing(msg);
      });
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_VIS_DATA_ARRIVE, function (msg) {
        return _this2.onJsonIdVisDataArrive(msg);
      });
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_UPDATE_TIME_STEP, function (_msg) {
        return _this2.updateTimestep();
      });
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_UPDATE_RATE_PARAM, function (_msg) {
        return _this2.updateRateParam();
      });
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_MODEL_DEFINITION, function (_msg) {
        return _this2.onModelDefinitionArrive();
      });
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_ERROR_MSG, function (msg) {
        return _this2.onErrorMsg(msg);
      });
    }

    /**
     * WebSocket Connect
     * */
  }, {
    key: "disconnect",
    value: function disconnect() {
      this.webSocketClient.disconnect();
    }
  }, {
    key: "getIp",
    value: function getIp() {
      return this.webSocketClient.getIp();
    }
  }, {
    key: "isConnectedToRemoteServer",
    value: function isConnectedToRemoteServer() {
      return this.webSocketClient.socketIsValid();
    }
  }, {
    key: "connectToRemoteServer",
    value: function () {
      var _connectToRemoteServer = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              this.registerBinaryMessageHandlers();
              this.registerJsonMessageHandlers();
              return _context.abrupt("return", this.webSocketClient.connectToRemoteServer());
            case 3:
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
    /**
     * Websocket Update Parameters
     */
  }, {
    key: "sendTimeStepUpdate",
    value: function sendTimeStepUpdate(newTimeStep) {
      var jsonData = {
        msgType: NetMessageEnum.ID_UPDATE_TIME_STEP,
        timeStep: newTimeStep
      };
      this.webSocketClient.sendWebSocketRequest(jsonData, "Update Time-Step");
    }
  }, {
    key: "sendParameterUpdate",
    value: function sendParameterUpdate(paramName, paramValue) {
      var jsonData = {
        msgType: NetMessageEnum.ID_UPDATE_RATE_PARAM,
        paramName: paramName,
        paramValue: paramValue
      };
      this.webSocketClient.sendWebSocketRequest(jsonData, "Rate Parameter Update");
    }

    /**
     * WebSocket Simulation Control
     */
  }, {
    key: "initialize",
    value: function initialize(fileName) {
      var _this3 = this;
      if (!this.isConnectedToRemoteServer()) {
        this.connectToRemoteServer();
      }
      this.lastRequestedFile = fileName;
      var jsonData = {
        msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
        fileName: fileName
      };

      // begins a stream which will include a TrajectoryFileInfo and a series of VisDataMessages
      // Note that it is possible for the first vis data to arrive before the TrajectoryFileInfo...
      return this.connectToRemoteServer().then(function () {
        _this3.webSocketClient.sendWebSocketRequest(jsonData, "Start Trajectory File Playback");
      })["catch"](function (error) {
        throw new FrontEndError(error.message, ErrorLevel.ERROR);
      });
    }
  }, {
    key: "pause",
    value: function pause() {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_PAUSE,
        fileName: this.lastRequestedFile
      }, "Pause Simulation");
    }
  }, {
    key: "stream",
    value: function stream() {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_RESUME,
        fileName: this.lastRequestedFile
      }, "Resume Simulation");
    }
  }, {
    key: "abort",
    value: function abort() {
      if (!this.socketIsValid()) {
        return;
      }
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_ABORT,
        fileName: this.lastRequestedFile
      }, "Abort Simulation");
    }
  }, {
    key: "requestFrame",
    value: function requestFrame(startFrameNumber) {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        frameNumber: startFrameNumber,
        fileName: this.lastRequestedFile
      }, "Request Single Frame");
    }
  }, {
    key: "requestFrameByTime",
    value: function requestFrameByTime(time) {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
        time: time,
        fileName: this.lastRequestedFile
      }, "Load single frame at specified Time");
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(fileName) {
      this.lastRequestedFile = fileName;
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
        fileName: fileName
      }, "Initialize trajectory file info");
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(_obj) {
      return Promise.resolve();
    }
  }]);
}();