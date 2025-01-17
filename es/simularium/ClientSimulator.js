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
    _defineProperty(this, "handleError", void 0);
    this.logger = jsLogger.get("netconnection");
    this.logger.setLevel(jsLogger.DEBUG);
    this.onTrajectoryFileInfoArrive = function () {
      /* do nothing */
    };
    this.onTrajectoryDataArrive = function () {
      /* do nothing */
    };
    this.handleError = function () {
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
    key: "setErrorHandler",
    value: function setErrorHandler(handler) {
      this.handleError = handler;
    }
  }, {
    key: "sendSimulationRequest",
    value: function sendSimulationRequest(jsonData, _requestDescription) {
      var _this = this;
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
      var jsonData = {
        msgType: ClientMessageEnum.ID_UPDATE_TIME_STEP,
        timeStep: newTimeStep
      };
      this.sendSimulationRequest(jsonData, "Update Time-Step");
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(obj) {
      obj.msgType = ClientMessageEnum.ID_UPDATE_SIMULATION_STATE;
      this.sendSimulationRequest(obj, "Simulation State Update");
      return Promise.resolve();
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
    key: "initialize",
    value: function initialize(fileName) {
      var _this2 = this;
      var jsonData = {
        msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        fileName: fileName
      };
      return Promise.resolve().then(function () {
        _this2.sendSimulationRequest(jsonData, "Start Trajectory File Playback");
      });
    }
  }, {
    key: "pause",
    value: function pause() {
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_VIS_DATA_PAUSE
      }, "Pause Simulation");
    }
  }, {
    key: "stream",
    value: function stream() {
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_VIS_DATA_RESUME
      }, "Resume Simulation");
    }
  }, {
    key: "abort",
    value: function abort() {
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_VIS_DATA_ABORT
      }, "Abort Simulation");
    }
  }, {
    key: "requestFrame",
    value: function requestFrame(startFrameNumber) {
      this.sendSimulationRequest({
        msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
        mode: ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
        frameNumber: startFrameNumber
      }, "Request Single Frame");
    }
  }, {
    key: "requestFrameByTime",
    value: function requestFrameByTime(time) {
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