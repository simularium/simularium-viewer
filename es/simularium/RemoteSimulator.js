import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import jsLogger from "js-logger";
import { v4 as uuidv4 } from "uuid";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import { NetMessageEnum, NetMessage } from "./WebsocketClient";
var PlayBackType; // a RemoteSimulator is a ISimulator that connects to the Simularium Engine
// back end server and plays back a trajectory specified in the NetConnectionParams

(function (PlayBackType) {
  PlayBackType[PlayBackType["ID_LIVE_SIMULATION"] = 0] = "ID_LIVE_SIMULATION";
  PlayBackType[PlayBackType["ID_PRE_RUN_SIMULATION"] = 1] = "ID_PRE_RUN_SIMULATION";
  PlayBackType[PlayBackType["ID_TRAJECTORY_FILE_PLAYBACK"] = 2] = "ID_TRAJECTORY_FILE_PLAYBACK";
  PlayBackType[PlayBackType["LENGTH"] = 3] = "LENGTH";
})(PlayBackType || (PlayBackType = {}));

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

  _createClass(RemoteSimulator, [{
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
      this.logger.debug("Update Timestep Message Arrived"); // TODO: implement callback
    }
  }, {
    key: "updateRateParam",
    value: function updateRateParam() {
      this.logger.debug("Update Rate Param Message Arrived"); // TODO: implement callback
    }
  }, {
    key: "onModelDefinitionArrive",
    value: function onModelDefinitionArrive() {
      this.logger.debug("Model Definition Arrived"); // TODO: implement callback
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

      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_TRAJECTORY_FILE_INFO, this.onTrajectoryFileInfoArrive);
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_HEARTBEAT_PING, this.onHeartbeatPing);
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_VIS_DATA_ARRIVE, function (msg) {
        return _this2.onJsonIdVisDataArrive(msg);
      });
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_UPDATE_TIME_STEP, this.updateTimestep);
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_UPDATE_RATE_PARAM, this.updateRateParam);
      this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_MODEL_DEFINITION, this.onModelDefinitionArrive);
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
    key: "connectToRemoteServer",
    value: function () {
      var _connectToRemoteServer = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                this.registerBinaryMessageHandlers();
                this.registerJsonMessageHandlers();
                return _context.abrupt("return", this.webSocketClient.connectToRemoteServer());

              case 3:
              case "end":
                return _context.stop();
            }
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
  }, {
    key: "sendModelDefinition",
    value: function sendModelDefinition(model) {
      var dataToSend = {
        model: model,
        msgType: NetMessageEnum.ID_MODEL_DEFINITION
      };
      this.webSocketClient.sendWebSocketRequest(dataToSend, "Model Definition");
    }
    /**
     * WebSocket Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */

  }, {
    key: "startRemoteSimPreRun",
    value: function startRemoteSimPreRun(timeStep, numTimeSteps) {
      var _this3 = this;

      var jsonData = {
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_PRE_RUN_SIMULATION,
        timeStep: timeStep,
        numTimeSteps: numTimeSteps
      };
      return this.connectToRemoteServer().then(function () {
        _this3.webSocketClient.sendWebSocketRequest(jsonData, "Start Simulation Pre-Run");
      })["catch"](function (e) {
        throw new FrontEndError(e.message, ErrorLevel.ERROR);
      });
    }
  }, {
    key: "startRemoteSimLive",
    value: function startRemoteSimLive() {
      var _this4 = this;

      var jsonData = {
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_LIVE_SIMULATION
      };
      return this.connectToRemoteServer().then(function () {
        _this4.webSocketClient.sendWebSocketRequest(jsonData, "Start Simulation Live");
      })["catch"](function (e) {
        throw new FrontEndError(e.message, ErrorLevel.ERROR);
      });
    }
  }, {
    key: "startRemoteTrajectoryPlayback",
    value: function startRemoteTrajectoryPlayback(fileName) {
      var _this5 = this;

      this.lastRequestedFile = fileName;
      var jsonData = {
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        "file-name": fileName
      }; // begins a stream which will include a TrajectoryFileInfo and a series of VisDataMessages
      // Note that it is possible for the first vis data to arrive before the TrajectoryFileInfo...

      return this.connectToRemoteServer().then(function () {
        _this5.webSocketClient.sendWebSocketRequest(jsonData, "Start Trajectory File Playback");
      })["catch"](function (error) {
        throw new FrontEndError(error.message, ErrorLevel.ERROR);
      });
    }
  }, {
    key: "pauseRemoteSim",
    value: function pauseRemoteSim() {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_PAUSE
      }, "Pause Simulation");
    }
  }, {
    key: "resumeRemoteSim",
    value: function resumeRemoteSim() {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_RESUME
      }, "Resume Simulation");
    }
  }, {
    key: "abortRemoteSim",
    value: function abortRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }

      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_ABORT
      }, "Abort Simulation");
    }
  }, {
    key: "requestSingleFrame",
    value: function requestSingleFrame(startFrameNumber) {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        frameNumber: startFrameNumber
      }, "Request Single Frame");
    }
  }, {
    key: "gotoRemoteSimulationTime",
    value: function gotoRemoteSimulationTime(time) {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
        time: time
      }, "Load single frame at specified Time");
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(fileName) {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
        fileName: fileName
      }, "Initialize trajectory file info");
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(obj) {
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_UPDATE_SIMULATION_STATE,
        data: obj
      }, "Send update instructions to simulation server");
    } // Start autoconversion and roll right into the simulation

  }, {
    key: "convertTrajectory",
    value: function convertTrajectory(dataToConvert, fileType) {
      var _this6 = this;

      return this.connectToRemoteServer().then(function () {
        _this6.sendTrajectory(dataToConvert, fileType);
      })["catch"](function (e) {
        throw new FrontEndError(e.message, ErrorLevel.ERROR);
      });
    }
  }, {
    key: "sendTrajectory",
    value: function sendTrajectory(dataToConvert, fileType) {
      // Generate random file name for converted file to be stored on the server
      var fileName = uuidv4() + ".simularium";
      this.lastRequestedFile = fileName;
      this.webSocketClient.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
        trajType: fileType.toLowerCase(),
        fileName: fileName,
        data: dataToConvert
      }, "Convert trajectory output to simularium file format");
    }
  }]);

  return RemoteSimulator;
}();