"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RemoteSimulator = exports.NetMessageEnum = exports.CONNECTION_SUCCESS_MSG = exports.CONNECTION_FAIL_MSG = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _jsLogger = _interopRequireDefault(require("js-logger"));

var _FrontEndError = require("./FrontEndError");

// these have been set to correspond to backend values
var NetMessageEnum; // these have been set to correspond to backend values

exports.NetMessageEnum = NetMessageEnum;

(function (NetMessageEnum) {
  NetMessageEnum[NetMessageEnum["ID_UNDEFINED_WEB_REQUEST"] = 0] = "ID_UNDEFINED_WEB_REQUEST";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_ARRIVE"] = 1] = "ID_VIS_DATA_ARRIVE";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_REQUEST"] = 2] = "ID_VIS_DATA_REQUEST";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_FINISH"] = 3] = "ID_VIS_DATA_FINISH";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_PAUSE"] = 4] = "ID_VIS_DATA_PAUSE";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_RESUME"] = 5] = "ID_VIS_DATA_RESUME";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_ABORT"] = 6] = "ID_VIS_DATA_ABORT";
  NetMessageEnum[NetMessageEnum["ID_UPDATE_TIME_STEP"] = 7] = "ID_UPDATE_TIME_STEP";
  NetMessageEnum[NetMessageEnum["ID_UPDATE_RATE_PARAM"] = 8] = "ID_UPDATE_RATE_PARAM";
  NetMessageEnum[NetMessageEnum["ID_MODEL_DEFINITION"] = 9] = "ID_MODEL_DEFINITION";
  NetMessageEnum[NetMessageEnum["ID_HEARTBEAT_PING"] = 10] = "ID_HEARTBEAT_PING";
  NetMessageEnum[NetMessageEnum["ID_HEARTBEAT_PONG"] = 11] = "ID_HEARTBEAT_PONG";
  NetMessageEnum[NetMessageEnum["ID_TRAJECTORY_FILE_INFO"] = 12] = "ID_TRAJECTORY_FILE_INFO";
  NetMessageEnum[NetMessageEnum["ID_GOTO_SIMULATION_TIME"] = 13] = "ID_GOTO_SIMULATION_TIME";
  NetMessageEnum[NetMessageEnum["ID_INIT_TRAJECTORY_FILE"] = 14] = "ID_INIT_TRAJECTORY_FILE";
  NetMessageEnum[NetMessageEnum["ID_UPDATE_SIMULATION_STATE"] = 15] = "ID_UPDATE_SIMULATION_STATE";
  NetMessageEnum[NetMessageEnum["LENGTH"] = 16] = "LENGTH";
})(NetMessageEnum || (exports.NetMessageEnum = NetMessageEnum = {}));

var PlayBackType;

(function (PlayBackType) {
  PlayBackType[PlayBackType["ID_LIVE_SIMULATION"] = 0] = "ID_LIVE_SIMULATION";
  PlayBackType[PlayBackType["ID_PRE_RUN_SIMULATION"] = 1] = "ID_PRE_RUN_SIMULATION";
  PlayBackType[PlayBackType["ID_TRAJECTORY_FILE_PLAYBACK"] = 2] = "ID_TRAJECTORY_FILE_PLAYBACK";
  PlayBackType[PlayBackType["LENGTH"] = 3] = "LENGTH";
})(PlayBackType || (PlayBackType = {}));

var CONNECTION_SUCCESS_MSG = "Remote sim successfully started";
exports.CONNECTION_SUCCESS_MSG = CONNECTION_SUCCESS_MSG;
var CONNECTION_FAIL_MSG = "Failed to connect to server; try reloading. If the problem persists, there may be a problem with your connection speed or the server might be too busy.";
exports.CONNECTION_FAIL_MSG = CONNECTION_FAIL_MSG;

// a RemoteSimulator is a ISimulator that connects to the Simularium Engine
// back end server and plays back a trajectory specified in the NetConnectionParams
var RemoteSimulator = /*#__PURE__*/function () {
  function RemoteSimulator(opts, errorHandler) {
    (0, _classCallCheck2["default"])(this, RemoteSimulator);
    (0, _defineProperty2["default"])(this, "webSocket", void 0);
    (0, _defineProperty2["default"])(this, "serverIp", void 0);
    (0, _defineProperty2["default"])(this, "serverPort", void 0);
    (0, _defineProperty2["default"])(this, "logger", void 0);
    (0, _defineProperty2["default"])(this, "onTrajectoryFileInfoArrive", void 0);
    (0, _defineProperty2["default"])(this, "onTrajectoryDataArrive", void 0);
    (0, _defineProperty2["default"])(this, "lastRequestedFile", void 0);
    (0, _defineProperty2["default"])(this, "connectionTimeWaited", void 0);
    (0, _defineProperty2["default"])(this, "connectionRetries", void 0);
    (0, _defineProperty2["default"])(this, "handleError", void 0);
    this.webSocket = null;
    this.serverIp = opts && opts.serverIp ? opts.serverIp : "localhost";
    this.serverPort = opts && opts.serverPort ? opts.serverPort : 9002;
    this.connectionTimeWaited = 0;
    this.connectionRetries = 0;
    this.lastRequestedFile = "";

    this.handleError = errorHandler || function () {
      /* do nothing */
    };

    this.logger = _jsLogger["default"].get("netconnection");
    this.logger.setLevel(_jsLogger["default"].DEBUG);

    this.onTrajectoryFileInfoArrive = function () {
      /* do nothing */
    };

    this.onTrajectoryDataArrive = function () {
      /* do nothing */
    }; // Frees the reserved backend in the event that the window closes w/o disconnecting


    window.addEventListener("beforeunload", this.onClose.bind(this));
  }

  (0, _createClass2["default"])(RemoteSimulator, [{
    key: "setTrajectoryFileInfoHandler",
    value: function setTrajectoryFileInfoHandler(handler) {
      this.onTrajectoryFileInfoArrive = handler;
    }
  }, {
    key: "setTrajectoryDataHandler",
    value: function setTrajectoryDataHandler(handler) {
      this.onTrajectoryDataArrive = handler;
    }
    /**
     * WebSocket State
     */

  }, {
    key: "socketIsConnecting",
    value: function socketIsConnecting() {
      return this.webSocket !== null && this.webSocket.readyState === this.webSocket.CONNECTING;
    }
  }, {
    key: "socketIsValid",
    value: function socketIsValid() {
      return !(this.webSocket === null || this.webSocket.readyState === this.webSocket.CLOSED);
    }
  }, {
    key: "socketIsConnected",
    value: function socketIsConnected() {
      return this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN;
    }
    /**
     *   Websocket Message Handler
     * */

  }, {
    key: "onMessage",
    value: function onMessage(event) {
      if (!this.socketIsValid()) {
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        var floatView = new Float32Array(event.data);
        var binaryMsgType = floatView[0];

        if (binaryMsgType === NetMessageEnum.ID_VIS_DATA_ARRIVE) {
          var OFFSET_TO_NAME_LENGTH = 8;
          var nameLength = floatView[1];
          var byteView = new Uint8Array(event.data);
          var fileBytes = byteView.subarray(OFFSET_TO_NAME_LENGTH, OFFSET_TO_NAME_LENGTH + nameLength);
          var fileName = new TextDecoder("utf-8").decode(fileBytes);

          if (fileName == this.lastRequestedFile) {
            this.onTrajectoryDataArrive(event.data);
          } else {
            this.logger.error("File arrived ", fileName, " is not file ", this.lastRequestedFile);
          }
        } else {
          this.logger.error("Unexpected binary message arrived of type ", binaryMsgType);
        }

        return;
      }

      var msg = JSON.parse(event.data);
      var msgType = msg.msgType;
      var numMsgTypes = NetMessageEnum.LENGTH;

      if (msgType > numMsgTypes || msgType < 1) {
        // this suggests either the back-end is out of sync, or a connection to an unknown back-end
        //  either would be very bad
        this.logger.error("Unrecognized web message of type ", msg.msgType, " arrived");
        return;
      }

      switch (msgType) {
        case NetMessageEnum.ID_VIS_DATA_ARRIVE:
          if (msg.fileName === this.lastRequestedFile) {
            this.onTrajectoryDataArrive(msg);
          }

          break;

        case NetMessageEnum.ID_UPDATE_TIME_STEP:
          // TODO: callback to handle time step update
          break;

        case NetMessageEnum.ID_UPDATE_RATE_PARAM:
          // TODO: callback to handle rate param
          break;

        case NetMessageEnum.ID_HEARTBEAT_PING:
          this.sendWebSocketRequest({
            connId: msg.connId,
            msgType: NetMessageEnum.ID_HEARTBEAT_PONG
          }, "Heartbeat pong");
          break;

        case NetMessageEnum.ID_MODEL_DEFINITION:
          this.logger.debug("Model Definition Arrived"); // TODO: callback to handle model definition

          break;

        case NetMessageEnum.ID_TRAJECTORY_FILE_INFO:
          this.logger.debug("Trajectory file info Arrived");
          this.onTrajectoryFileInfoArrive(msg);
          break;

        default:
          this.logger.debug("Web request recieved", msg.msgType);
          break;
      }
    }
  }, {
    key: "onOpen",
    value: function onOpen() {
      /* do nothing */
    }
  }, {
    key: "onClose",
    value: function onClose() {
      /* do nothing */
    }
    /**
     * WebSocket Connect
     * */

  }, {
    key: "createWebSocket",
    value: function createWebSocket(uri) {
      // Create and initialize a WebSocket object
      if (this.socketIsValid()) {
        this.disconnect();
      }

      this.webSocket = new WebSocket(uri);
      this.webSocket.binaryType = "arraybuffer";
      this.logger.debug("WS Connection Request Sent: ", uri); // message handler

      this.webSocket.onopen = this.onOpen.bind(this);
      this.webSocket.onclose = this.onClose.bind(this);
      this.webSocket.onmessage = this.onMessage.bind(this);
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      if (!this.socketIsValid()) {
        this.logger.warn("disconnect failed, client is not connected");
        return;
      }

      if (this.webSocket !== null) {
        this.webSocket.close();
      }
    }
  }, {
    key: "getIp",
    value: function getIp() {
      return "wss://".concat(this.serverIp, ":").concat(this.serverPort, "/");
    }
  }, {
    key: "waitForWebSocket",
    value: function () {
      var _waitForWebSocket = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(timeout) {
        var _this = this;

        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", new Promise(function (resolve) {
                  return setTimeout(function () {
                    resolve(_this.socketIsConnected());
                  }, timeout);
                }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function waitForWebSocket(_x) {
        return _waitForWebSocket.apply(this, arguments);
      }

      return waitForWebSocket;
    }()
  }, {
    key: "checkConnection",
    value: function () {
      var _checkConnection = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(address) {
        var timeout,
            maxRetries,
            maxWaitTime,
            isConnected,
            _args2 = arguments;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                timeout = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : 1000;
                maxRetries = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : 1;
                // Check if the WebSocket becomes connected within an allotted amount
                // of time and number of retries.
                // Initially wait for a max wait time of maxWaitTime, then retry
                // connecting <maxRetries> time(s). In a retry, only wait for the
                // amount of time specified as timeout.
                maxWaitTime = 4 * timeout;
                _context2.next = 5;
                return this.waitForWebSocket(timeout);

              case 5:
                isConnected = _context2.sent;
                this.connectionTimeWaited += timeout;

                if (!isConnected) {
                  _context2.next = 11;
                  break;
                }

                return _context2.abrupt("return", true);

              case 11:
                if (!(this.connectionTimeWaited < maxWaitTime)) {
                  _context2.next = 15;
                  break;
                }

                return _context2.abrupt("return", this.checkConnection(address, timeout));

              case 15:
                if (!(this.connectionRetries < maxRetries)) {
                  _context2.next = 21;
                  break;
                }

                this.createWebSocket(address);
                this.connectionRetries++;
                return _context2.abrupt("return", this.checkConnection(address, timeout));

              case 21:
                return _context2.abrupt("return", false);

              case 22:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function checkConnection(_x2) {
        return _checkConnection.apply(this, arguments);
      }

      return checkConnection;
    }()
  }, {
    key: "connectToRemoteServer",
    value: function () {
      var _connectToRemoteServer = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(address) {
        var isConnectionSuccessful;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this.connectionTimeWaited = 0;
                this.connectionRetries = 0;

                if (!this.socketIsConnected()) {
                  _context3.next = 4;
                  break;
                }

                return _context3.abrupt("return", CONNECTION_SUCCESS_MSG);

              case 4:
                this.createWebSocket(address);
                _context3.next = 7;
                return this.checkConnection(address);

              case 7:
                isConnectionSuccessful = _context3.sent;

                if (!isConnectionSuccessful) {
                  _context3.next = 12;
                  break;
                }

                return _context3.abrupt("return", CONNECTION_SUCCESS_MSG);

              case 12:
                throw new Error(CONNECTION_FAIL_MSG);

              case 13:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function connectToRemoteServer(_x3) {
        return _connectToRemoteServer.apply(this, arguments);
      }

      return connectToRemoteServer;
    }()
    /**
     * Websocket Send Helper Functions
     */

  }, {
    key: "logWebSocketRequest",
    value: function logWebSocketRequest(whatRequest, jsonData) {
      this.logger.debug("Web Socket Request Sent: ", whatRequest, jsonData);
    }
  }, {
    key: "sendWebSocketRequest",
    value: function sendWebSocketRequest(jsonData, requestDescription) {
      if (this.socketIsValid()) {
        if (this.webSocket !== null) {
          this.webSocket.send(JSON.stringify(jsonData));
        }

        this.logWebSocketRequest(requestDescription, jsonData);
      } else {
        console.error("Request to server cannot be made with a closed Websocket connection.");
        this.handleError(new _FrontEndError.FrontEndError("Connection to server is closed; please try reloading. If the problem persists, the server may be too busy. Please try again at another time.", _FrontEndError.ErrorLevel.ERROR));
      }
    }
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
      this.sendWebSocketRequest(jsonData, "Update Time-Step");
    }
  }, {
    key: "sendParameterUpdate",
    value: function sendParameterUpdate(paramName, paramValue) {
      var jsonData = {
        msgType: NetMessageEnum.ID_UPDATE_RATE_PARAM,
        paramName: paramName,
        paramValue: paramValue
      };
      this.sendWebSocketRequest(jsonData, "Rate Parameter Update");
    }
  }, {
    key: "sendModelDefinition",
    value: function sendModelDefinition(model) {
      var dataToSend = {
        model: model,
        msgType: NetMessageEnum.ID_MODEL_DEFINITION
      };
      this.sendWebSocketRequest(dataToSend, "Model Definition");
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
      var _this2 = this;

      var jsonData = {
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_PRE_RUN_SIMULATION,
        timeStep: timeStep,
        numTimeSteps: numTimeSteps
      };
      return this.connectToRemoteServer(this.getIp()).then(function () {
        _this2.sendWebSocketRequest(jsonData, "Start Simulation Pre-Run");
      })["catch"](function (e) {
        throw new _FrontEndError.FrontEndError(e.message, _FrontEndError.ErrorLevel.ERROR);
      });
    }
  }, {
    key: "startRemoteSimLive",
    value: function startRemoteSimLive() {
      var _this3 = this;

      var jsonData = {
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_LIVE_SIMULATION
      };
      return this.connectToRemoteServer(this.getIp()).then(function () {
        _this3.sendWebSocketRequest(jsonData, "Start Simulation Live");
      })["catch"](function (e) {
        throw new _FrontEndError.FrontEndError(e.message, _FrontEndError.ErrorLevel.ERROR);
      });
    }
  }, {
    key: "startRemoteTrajectoryPlayback",
    value: function startRemoteTrajectoryPlayback(fileName) {
      var _this4 = this;

      this.lastRequestedFile = fileName;
      var jsonData = {
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        "file-name": fileName
      }; // begins a stream which will include a TrajectoryFileInfo and a series of VisDataMessages
      // Note that it is possible for the first vis data to arrive before the TrajectoryFileInfo...

      return this.connectToRemoteServer(this.getIp()).then(function () {
        _this4.sendWebSocketRequest(jsonData, "Start Trajectory File Playback");
      })["catch"](function (error) {
        throw new _FrontEndError.FrontEndError(error.message, _FrontEndError.ErrorLevel.ERROR);
      });
    }
  }, {
    key: "pauseRemoteSim",
    value: function pauseRemoteSim() {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_PAUSE
      }, "Pause Simulation");
    }
  }, {
    key: "resumeRemoteSim",
    value: function resumeRemoteSim() {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_RESUME
      }, "Resume Simulation");
    }
  }, {
    key: "abortRemoteSim",
    value: function abortRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }

      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_ABORT
      }, "Abort Simulation");
    }
  }, {
    key: "requestSingleFrame",
    value: function requestSingleFrame(startFrameNumber) {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        frameNumber: startFrameNumber
      }, "Request Single Frame");
    }
  }, {
    key: "gotoRemoteSimulationTime",
    value: function gotoRemoteSimulationTime(time) {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
        time: time
      }, "Load single frame at specified Time");
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(fileName) {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
        fileName: fileName
      }, "Initialize trajectory file info");
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(obj) {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_UPDATE_SIMULATION_STATE,
        data: obj
      }, "Send update instructions to simulation server");
    }
  }]);
  return RemoteSimulator;
}();

exports.RemoteSimulator = RemoteSimulator;