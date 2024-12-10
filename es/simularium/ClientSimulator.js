import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import jsLogger from "js-logger";
import { ClientMessageEnum, ClientPlayBackType } from "./localSimulators/IClientSimulatorImpl.js";
// a ClientSimulator is a ISimulator that is expected to run purely in procedural javascript in the browser client,
// with the procedural implementation in a IClientSimulatorImpl
export var ClientSimulator = /*#__PURE__*/function () {
  function ClientSimulator(sim) {
    _classCallCheck(this, ClientSimulator);
    _defineProperty(this, "localSimulator", void 0);
    _defineProperty(this, "simulatorIntervalId", 0);
    // throttle the data interval so that the local client can keep up
    // ideally the client (VisData) needs to be able to handle the data rate
    _defineProperty(this, "dataInterval", 66);
    _defineProperty(this, "logger", void 0);
    _defineProperty(this, "onTrajectoryFileInfoArrive", void 0);
    _defineProperty(this, "onTrajectoryDataArrive", void 0);
    this.logger = jsLogger.get("netconnection");
    this.logger.setLevel(jsLogger.DEBUG);
    this.onTrajectoryFileInfoArrive = function () {
      /* do nothing */
    };
    this.onTrajectoryDataArrive = function () {
      /* do nothing */
    };
    this.localSimulator = sim;
  }
  return _createClass(ClientSimulator, [{
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
    key: "isConnectedToRemoteServer",
    value: function isConnectedToRemoteServer() {
      return false;
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
        case ClientMessageEnum.ID_UPDATE_TIME_STEP:
          break;
        case ClientMessageEnum.ID_UPDATE_RATE_PARAM:
          break;
        case ClientMessageEnum.ID_MODEL_DEFINITION:
          break;
        case ClientMessageEnum.ID_UPDATE_SIMULATION_STATE:
          {
            this.localSimulator.updateSimulationState(jsonData["data"]);
          }
          break;
        case ClientMessageEnum.ID_VIS_DATA_REQUEST:
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
        case ClientMessageEnum.ID_VIS_DATA_PAUSE:
          {
            window.clearInterval(this.simulatorIntervalId);
            this.simulatorIntervalId = 0;
          }
          break;
        case ClientMessageEnum.ID_VIS_DATA_RESUME:
          {
            this.simulatorIntervalId = window.setInterval(function () {
              var frame = _this.localSimulator.update(0);
              _this.onTrajectoryDataArrive(frame);
            }, this.dataInterval);
          }
          break;
        case ClientMessageEnum.ID_VIS_DATA_ABORT:
          {
            window.clearInterval(this.simulatorIntervalId);
            this.simulatorIntervalId = 0;
          }
          break;
        case ClientMessageEnum.ID_GOTO_SIMULATION_TIME:
          {
            var _frame = this.localSimulator.update(jsonData["time"]);
            this.onTrajectoryDataArrive(_frame);
          }
          break;
        case ClientMessageEnum.ID_INIT_TRAJECTORY_FILE:
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
        msgType: ClientMessageEnum.ID_UPDATE_TIME_STEP,
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
      obj.msgType = ClientMessageEnum.ID_UPDATE_SIMULATION_STATE;
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
        msgType: ClientMessageEnum.ID_MODEL_DEFINITION
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
        msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: ClientPlayBackType.ID_PRE_RUN_SIMULATION,
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
        msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: ClientPlayBackType.ID_LIVE_SIMULATION
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
        msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        fileName: fileName
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
        msgType: ClientMessageEnum.ID_VIS_DATA_PAUSE
      }, "Pause Simulation");
    }
  }, {
    key: "resumeRemoteSim",
    value: function resumeRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_VIS_DATA_RESUME
      }, "Resume Simulation");
    }
  }, {
    key: "abortRemoteSim",
    value: function abortRemoteSim() {
      if (!this.socketIsValid()) {
        return;
      }
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_VIS_DATA_ABORT
      }, "Abort Simulation");
    }
  }, {
    key: "requestSingleFrame",
    value: function requestSingleFrame(startFrameNumber) {
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        frameNumber: startFrameNumber
      }, "Request Single Frame");
    }
  }, {
    key: "gotoRemoteSimulationTime",
    value: function gotoRemoteSimulationTime(time) {
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_GOTO_SIMULATION_TIME,
        time: time
      }, "Load single frame at specified Time");
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(fileName) {
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_INIT_TRAJECTORY_FILE,
        fileName: fileName
      }, "Initialize trajectory file info");
    }
  }]);
}();