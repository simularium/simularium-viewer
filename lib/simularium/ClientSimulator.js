"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ClientSimulator = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _jsLogger = _interopRequireDefault(require("js-logger"));

var _IClientSimulatorImpl = require("./localSimulators/IClientSimulatorImpl");

// a ClientSimulator is a ISimulator that is expected to run purely in procedural javascript in the browser client,
// with the procedural implementation in a IClientSimulatorImpl
var ClientSimulator = /*#__PURE__*/function () {
  // throttle the data interval so that the local client can keep up
  // ideally the client (VisData) needs to be able to handle the data rate
  function ClientSimulator(sim) {
    (0, _classCallCheck2["default"])(this, ClientSimulator);
    (0, _defineProperty2["default"])(this, "localSimulator", void 0);
    (0, _defineProperty2["default"])(this, "simulatorIntervalId", 0);
    (0, _defineProperty2["default"])(this, "dataInterval", 66);
    (0, _defineProperty2["default"])(this, "logger", void 0);
    (0, _defineProperty2["default"])(this, "onTrajectoryFileInfoArrive", void 0);
    (0, _defineProperty2["default"])(this, "onTrajectoryDataArrive", void 0);
    this.logger = _jsLogger["default"].get("netconnection");
    this.logger.setLevel(_jsLogger["default"].DEBUG);

    this.onTrajectoryFileInfoArrive = function () {
      /* do nothing */
    };

    this.onTrajectoryDataArrive = function () {
      /* do nothing */
    };

    this.localSimulator = sim;
  }

  (0, _createClass2["default"])(ClientSimulator, [{
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
      return true;
    }
    /**
     * Connect
     * */

  }, {
    key: "disconnect",
    value: function disconnect() {
      if (!this.socketIsValid()) {
        this.logger.warn("disconnect failed, client is not connected");
        return;
      }
    }
  }, {
    key: "getIp",
    value: function getIp() {
      return "";
    }
  }, {
    key: "connectToRemoteServer",
    value: function connectToRemoteServer(_address) {
      return Promise.resolve("Local client sim successfully started");
    }
  }, {
    key: "sendSimulationRequest",
    value: function sendSimulationRequest(jsonData, _requestDescription) {
      var _this = this;

      // do processing, then return!
      //this.logWebSocketRequest(requestDescription, jsonData);
      switch (jsonData.msgType) {
        case _IClientSimulatorImpl.ClientMessageEnum.ID_UPDATE_TIME_STEP:
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_UPDATE_RATE_PARAM:
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_MODEL_DEFINITION:
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_UPDATE_SIMULATION_STATE:
          {
            this.localSimulator.updateSimulationState(jsonData["data"]);
          }
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_REQUEST:
          {
            if (jsonData["frameNumber"] !== undefined) {
              var frame = this.localSimulator.update(jsonData["frameNumber"]);
              this.onTrajectoryDataArrive(frame);
            } else {
              var a = this.localSimulator.getInfo();
              this.onTrajectoryFileInfoArrive(a);
            }
          }
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_PAUSE:
          {
            window.clearInterval(this.simulatorIntervalId);
            this.simulatorIntervalId = 0;
          }
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_RESUME:
          {
            this.simulatorIntervalId = window.setInterval(function () {
              var frame = _this.localSimulator.update(0);

              _this.onTrajectoryDataArrive(frame);
            }, this.dataInterval);
          }
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_ABORT:
          {
            window.clearInterval(this.simulatorIntervalId);
            this.simulatorIntervalId = 0;
          }
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_GOTO_SIMULATION_TIME:
          {
            var _frame = this.localSimulator.update(jsonData["time"]);

            this.onTrajectoryDataArrive(_frame);
          }
          break;

        case _IClientSimulatorImpl.ClientMessageEnum.ID_INIT_TRAJECTORY_FILE:
          {
            var _a = this.localSimulator.getInfo();

            console.log("receive trajectory file info");
            this.onTrajectoryFileInfoArrive(_a);
          }
          break;
      }
    }
  }, {
    key: "sendTimeStepUpdate",
    value: function sendTimeStepUpdate(newTimeStep) {
      if (!this.socketIsValid()) {
        return;
      }

      var jsonData = {
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_UPDATE_TIME_STEP,
        timeStep: newTimeStep
      };
      this.sendSimulationRequest(jsonData, "Update Time-Step");
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(obj) {
      if (!this.socketIsValid()) {
        return;
      }

      obj.msgType = _IClientSimulatorImpl.ClientMessageEnum.ID_UPDATE_SIMULATION_STATE;
      this.sendSimulationRequest(obj, "Simulation State Update");
    }
  }, {
    key: "sendModelDefinition",
    value: function sendModelDefinition(model) {
      if (!this.socketIsValid()) {
        return;
      }

      var dataToSend = {
        model: model,
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_MODEL_DEFINITION
      };
      this.sendSimulationRequest(dataToSend, "Model Definition");
    }
    /**
     * Simulation Control
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
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: _IClientSimulatorImpl.ClientPlayBackType.ID_PRE_RUN_SIMULATION,
        timeStep: timeStep,
        numTimeSteps: numTimeSteps
      };
      this.connectToRemoteServer(this.getIp()).then(function () {
        _this2.sendSimulationRequest(jsonData, "Start Simulation Pre-Run");
      });
    }
  }, {
    key: "startRemoteSimLive",
    value: function startRemoteSimLive() {
      var _this3 = this;

      var jsonData = {
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: _IClientSimulatorImpl.ClientPlayBackType.ID_LIVE_SIMULATION
      };
      this.connectToRemoteServer(this.getIp()).then(function () {
        _this3.sendSimulationRequest(jsonData, "Start Simulation Live");
      });
    }
  }, {
    key: "startRemoteTrajectoryPlayback",
    value: function startRemoteTrajectoryPlayback(fileName) {
      var _this4 = this;

      var jsonData = {
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: _IClientSimulatorImpl.ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        "file-name": fileName
      };
      return this.connectToRemoteServer(this.getIp()).then(function () {
        _this4.sendSimulationRequest(jsonData, "Start Trajectory File Playback");
      });
    }
  }, {
    key: "pauseRemoteSim",
    value: function pauseRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }

      this.sendSimulationRequest({
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_PAUSE
      }, "Pause Simulation");
    }
  }, {
    key: "resumeRemoteSim",
    value: function resumeRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }

      this.sendSimulationRequest({
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_RESUME
      }, "Resume Simulation");
    }
  }, {
    key: "abortRemoteSim",
    value: function abortRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }

      this.sendSimulationRequest({
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_ABORT
      }, "Abort Simulation");
    }
  }, {
    key: "requestSingleFrame",
    value: function requestSingleFrame(startFrameNumber) {
      this.sendSimulationRequest({
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: _IClientSimulatorImpl.ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        frameNumber: startFrameNumber
      }, "Request Single Frame");
    }
  }, {
    key: "gotoRemoteSimulationTime",
    value: function gotoRemoteSimulationTime(time) {
      this.sendSimulationRequest({
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_GOTO_SIMULATION_TIME,
        time: time
      }, "Load single frame at specified Time");
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(fileName) {
      this.sendSimulationRequest({
        msgType: _IClientSimulatorImpl.ClientMessageEnum.ID_INIT_TRAJECTORY_FILE,
        fileName: fileName
      }, "Initialize trajectory file info");
    }
  }]);
  return ClientSimulator;
}();

exports.ClientSimulator = ClientSimulator;