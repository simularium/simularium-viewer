import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import jsLogger from "js-logger";
// a LocalFileSimulator is a ISimulator that plays back the contents of
// a drag-n-drop trajectory file (a ISimulariumFile object)
export var LocalFileSimulator = /*#__PURE__*/function () {
  // setInterval is the playback engine for now
  function LocalFileSimulator(fileName, simulariumFile) {
    _classCallCheck(this, LocalFileSimulator);

    _defineProperty(this, "fileName", void 0);

    _defineProperty(this, "simulariumFile", void 0);

    _defineProperty(this, "logger", void 0);

    _defineProperty(this, "onTrajectoryFileInfoArrive", void 0);

    _defineProperty(this, "onTrajectoryDataArrive", void 0);

    _defineProperty(this, "playbackIntervalId", 0);

    _defineProperty(this, "currentPlaybackFrameIndex", 0);

    this.fileName = fileName;
    this.simulariumFile = simulariumFile;
    this.logger = jsLogger.get("netconnection");
    this.logger.setLevel(jsLogger.DEBUG);

    this.onTrajectoryFileInfoArrive = function () {
      /* do nothing */
    };

    this.onTrajectoryDataArrive = function () {
      /* do nothing */
    };

    console.log("NEW LOCALFILECONNECTION");
  }

  _createClass(LocalFileSimulator, [{
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
      this.abortRemoteSim();
    }
  }, {
    key: "getIp",
    value: function getIp() {
      return "";
    }
  }, {
    key: "connectToRemoteServer",
    value: function connectToRemoteServer(_address) {
      return Promise.resolve("Local file successfully started");
    }
  }, {
    key: "sendTimeStepUpdate",
    value: function sendTimeStepUpdate(_newTimeStep) {// not implemented
    }
  }, {
    key: "sendParameterUpdate",
    value: function sendParameterUpdate(_paramName, _paramValue) {// not implemented
    }
  }, {
    key: "sendModelDefinition",
    value: function sendModelDefinition(_model) {// not implemented
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
    value: function startRemoteSimPreRun(_timeStep, _numTimeSteps) {// not implemented
    }
  }, {
    key: "startRemoteSimLive",
    value: function startRemoteSimLive() {// not implemented
    }
  }, {
    key: "startRemoteTrajectoryPlayback",
    value: function startRemoteTrajectoryPlayback(_fileName) {
      try {
        var trajectoryInfo = this.simulariumFile.getTrajectoryFileInfo();
        this.onTrajectoryFileInfoArrive(trajectoryInfo);
      } catch (e) {
        return Promise.reject(e);
      }

      return Promise.resolve();
    }
  }, {
    key: "pauseRemoteSim",
    value: function pauseRemoteSim() {
      window.clearInterval(this.playbackIntervalId);
      this.playbackIntervalId = 0;
    }
  }, {
    key: "resumeRemoteSim",
    value: function resumeRemoteSim() {
      var _this = this;

      this.playbackIntervalId = window.setInterval(function () {
        var numFrames = _this.simulariumFile.getNumFrames();

        if (_this.currentPlaybackFrameIndex >= numFrames) {
          _this.currentPlaybackFrameIndex = numFrames - 1;

          _this.pauseRemoteSim();

          return;
        }

        _this.onTrajectoryDataArrive(_this.getFrame(_this.currentPlaybackFrameIndex));

        _this.currentPlaybackFrameIndex++;
      }, 1);
    }
  }, {
    key: "abortRemoteSim",
    value: function abortRemoteSim() {
      window.clearInterval(this.playbackIntervalId);
      this.playbackIntervalId = 0;
      this.currentPlaybackFrameIndex = 0;
    }
  }, {
    key: "requestSingleFrame",
    value: function requestSingleFrame(startFrameNumber) {
      this.onTrajectoryDataArrive(this.getFrame(startFrameNumber));
    }
  }, {
    key: "gotoRemoteSimulationTime",
    value: function gotoRemoteSimulationTime(time) {
      var frameNumber = this.simulariumFile.getFrameIndexAtTime(time); // frameNumber is -1 if findIndex() above doesn't find a match

      if (frameNumber !== -1) {
        this.currentPlaybackFrameIndex = frameNumber;
        this.requestSingleFrame(frameNumber);
      }
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(_fileName) {
      this.onTrajectoryFileInfoArrive(this.simulariumFile.getTrajectoryFileInfo());
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(_obj) {// not implemented
    }
  }, {
    key: "getFrame",
    value: function getFrame(theFrameNumber) {
      // Possible TODO:
      // Theoretically we could return all frames here, and as a result
      // the Controller would precache the entire file in VisData.
      // Then subsequent frame requests would only hit the VisData cache.
      var data = this.simulariumFile.getFrame(theFrameNumber);

      if (data instanceof ArrayBuffer) {
        return data;
      } else {
        return {
          msgType: 0,
          bundleStart: theFrameNumber,
          bundleSize: 1,
          bundleData: [data],
          fileName: this.fileName
        };
      }
    }
  }, {
    key: "getSimulariumFile",
    value: function getSimulariumFile() {
      return this.simulariumFile;
    }
  }]);

  return LocalFileSimulator;
}();