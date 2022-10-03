"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NetConnection = exports.NetMessageEnum = void 0;

var _jsLogger = _interopRequireDefault(require("js-logger"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
  NetMessageEnum[NetMessageEnum["ID_PLAY_CACHE"] = 12] = "ID_PLAY_CACHE";
  NetMessageEnum[NetMessageEnum["ID_TRAJECTORY_FILE_INFO"] = 13] = "ID_TRAJECTORY_FILE_INFO";
  NetMessageEnum[NetMessageEnum["ID_GOTO_SIMULATION_TIME"] = 14] = "ID_GOTO_SIMULATION_TIME";
  NetMessageEnum[NetMessageEnum["ID_INIT_TRAJECTORY_FILE"] = 15] = "ID_INIT_TRAJECTORY_FILE";
  NetMessageEnum[NetMessageEnum["LENGTH"] = 16] = "LENGTH";
})(NetMessageEnum || (exports.NetMessageEnum = NetMessageEnum = {}));

var PlayBackType;

(function (PlayBackType) {
  PlayBackType[PlayBackType["ID_LIVE_SIMULATION"] = 0] = "ID_LIVE_SIMULATION";
  PlayBackType[PlayBackType["ID_PRE_RUN_SIMULATION"] = 1] = "ID_PRE_RUN_SIMULATION";
  PlayBackType[PlayBackType["ID_TRAJECTORY_FILE_PLAYBACK"] = 2] = "ID_TRAJECTORY_FILE_PLAYBACK";
  PlayBackType[PlayBackType["LENGTH"] = 3] = "LENGTH";
})(PlayBackType || (PlayBackType = {}));

var NetConnection = /*#__PURE__*/function () {
  function NetConnection(opts) {
    _classCallCheck(this, NetConnection);

    _defineProperty(this, "webSocket", void 0);

    _defineProperty(this, "serverIp", void 0);

    _defineProperty(this, "serverPort", void 0);

    _defineProperty(this, "logger", void 0);

    _defineProperty(this, "onTrajectoryFileInfoArrive", void 0);

    _defineProperty(this, "onTrajectoryDataArrive", void 0);

    _defineProperty(this, "lastRequestedFile", void 0);

    this.webSocket = null;
    this.serverIp = opts && opts.serverIp ? opts.serverIp : "localhost";
    this.serverPort = opts && opts.serverPort ? opts.serverPort : 9002;
    this.lastRequestedFile = "";
    this.logger = _jsLogger.default.get("netconnection");
    this.logger.setLevel(_jsLogger.default.DEBUG);

    this.onTrajectoryFileInfoArrive = function () {
      /* do nothing */
    };

    this.onTrajectoryDataArrive = function () {
      /* do nothing */
    }; // Frees the reserved backend in the event that the window closes w/o disconnecting


    window.addEventListener("beforeunload", this.onClose.bind(this));
  }
  /**
   * WebSocket State
   */


  _createClass(NetConnection, [{
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
    key: "connectToUri",
    value: function connectToUri(uri) {
      if (this.socketIsValid()) {
        this.disconnect();
      }

      this.webSocket = new WebSocket(uri);
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
    key: "connectToUriAsync",
    value: function connectToUriAsync(address) {
      var _this = this;

      var connectPromise = new Promise(function (resolve) {
        _this.connectToUri(address);

        resolve("Successfully connected to uri!");
      });
      return connectPromise;
    }
  }, {
    key: "connectToRemoteServer",
    value: function connectToRemoteServer(address) {
      var _this2 = this;

      var remoteStartPromise = new Promise(function (resolve, reject) {
        if (_this2.socketIsConnected()) {
          return resolve("Remote sim successfully started");
        }

        var startPromise = _this2.connectToUriAsync(address); // wait 1 second for websocket to open


        var waitForIsConnected = function waitForIsConnected() {
          return new Promise(function (resolve) {
            return setTimeout(function () {
              resolve(_this2.socketIsConnected());
            }, 1000);
          });
        };

        var handleReturn = /*#__PURE__*/function () {
          var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
            var isConnected;
            return regeneratorRuntime.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    _context.next = 2;
                    return waitForIsConnected();

                  case 2:
                    isConnected = _context.sent;
                    secondsWaited++;

                    if (!isConnected) {
                      _context.next = 8;
                      break;
                    }

                    resolve("Remote sim successfully started");
                    _context.next = 20;
                    break;

                  case 8:
                    if (!(secondsWaited < TOTAL_WAIT_SECONDS)) {
                      _context.next = 14;
                      break;
                    }

                    _context.next = 11;
                    return handleReturn();

                  case 11:
                    return _context.abrupt("return", _context.sent);

                  case 14:
                    if (!(connectionTries <= MAX_CONNECTION_TRIES)) {
                      _context.next = 19;
                      break;
                    }

                    connectionTries++;
                    return _context.abrupt("return", _this2.connectToUriAsync(address).then(handleReturn));

                  case 19:
                    reject(new Error("Failed to connected to requested server, try reloading. If problem keeps occurring check your connection speed"));

                  case 20:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee);
          }));

          return function handleReturn() {
            return _ref.apply(this, arguments);
          };
        }();

        var TOTAL_WAIT_SECONDS = 2;
        var secondsWaited = 0;
        var MAX_CONNECTION_TRIES = 2;
        var connectionTries = 1;
        return startPromise.then(handleReturn);
      });
      return remoteStartPromise;
    }
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
      if (this.webSocket !== null) {
        this.webSocket.send(JSON.stringify(jsonData));
      }

      this.logWebSocketRequest(requestDescription, jsonData);
    }
    /**
     * Websocket Update Parameters
     */

  }, {
    key: "sendTimeStepUpdate",
    value: function sendTimeStepUpdate(newTimeStep) {
      if (!this.socketIsValid()) {
        return;
      }

      var jsonData = {
        msgType: NetMessageEnum.ID_UPDATE_TIME_STEP,
        timeStep: newTimeStep
      };
      this.sendWebSocketRequest(jsonData, "Update Time-Step");
    }
  }, {
    key: "sendParameterUpdate",
    value: function sendParameterUpdate(paramName, paramValue) {
      if (!this.socketIsValid()) {
        return;
      }

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
      if (!this.socketIsValid()) {
        return;
      }

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
      var _this3 = this;

      var jsonData = {
        msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
        mode: PlayBackType.ID_PRE_RUN_SIMULATION,
        timeStep: timeStep,
        numTimeSteps: numTimeSteps
      };
      this.connectToRemoteServer(this.getIp()).then(function () {
        _this3.sendWebSocketRequest(jsonData, "Start Simulation Pre-Run");
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
      this.connectToRemoteServer(this.getIp()).then(function () {
        _this4.sendWebSocketRequest(jsonData, "Start Simulation Live");
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
      };
      return this.connectToRemoteServer(this.getIp()).then(function () {
        _this5.sendWebSocketRequest(jsonData, "Start Trajectory File Playback");
      });
    }
  }, {
    key: "playRemoteSimCacheFromFrame",
    value: function playRemoteSimCacheFromFrame(cacheFrame) {
      if (!this.socketIsValid()) {
        return;
      }

      var jsonData = {
        msgType: NetMessageEnum.ID_PLAY_CACHE,
        "frame-num": cacheFrame
      };
      this.sendWebSocketRequest(jsonData, "Play Simulation Cache from Frame");
    }
  }, {
    key: "pauseRemoteSim",
    value: function pauseRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }

      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_VIS_DATA_PAUSE
      }, "Pause Simulation");
    }
  }, {
    key: "resumeRemoteSim",
    value: function resumeRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }

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
    key: "playRemoteSimCacheFromTime",
    value: function playRemoteSimCacheFromTime(timeNanoSeconds) {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_PLAY_CACHE,
        time: timeNanoSeconds
      }, "Play Simulation Cache from Time");
    }
  }, {
    key: "gotoRemoteSimulationTime",
    value: function gotoRemoteSimulationTime(timeNanoSeconds) {
      this.sendWebSocketRequest({
        msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
        time: timeNanoSeconds
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
  }]);

  return NetConnection;
}();

exports.NetConnection = NetConnection;