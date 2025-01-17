import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import jsLogger from "js-logger";
// a LocalFileSimulator is a ISimulator that plays back the contents of
// a drag-n-drop trajectory file (a ISimulariumFile object)
export var LocalFileSimulator = /*#__PURE__*/function () {
  function LocalFileSimulator(fileName, simulariumFile) {
    _classCallCheck(this, LocalFileSimulator);
    _defineProperty(this, "fileName", void 0);
    _defineProperty(this, "simulariumFile", void 0);
    _defineProperty(this, "logger", void 0);
    _defineProperty(this, "onTrajectoryFileInfoArrive", void 0);
    _defineProperty(this, "onTrajectoryDataArrive", void 0);
    _defineProperty(this, "handleError", void 0);
    // setInterval is the playback engine for now
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
    this.handleError = function () {
      /* do nothing */
    };
    console.log("NEW LOCALFILECONNECTION");
  }
  return _createClass(LocalFileSimulator, [{
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
    key: "initialize",
    value: function initialize(_fileName) {
      try {
        var trajectoryInfo = this.simulariumFile.getTrajectoryFileInfo();
        this.onTrajectoryFileInfoArrive(trajectoryInfo);
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    }
  }, {
    key: "pause",
    value: function pause() {
      window.clearInterval(this.playbackIntervalId);
      this.playbackIntervalId = 0;
    }
  }, {
    key: "stream",
    value: function stream() {
      var _this = this;
      this.playbackIntervalId = window.setInterval(function () {
        var numFrames = _this.simulariumFile.getNumFrames();
        if (_this.currentPlaybackFrameIndex >= numFrames) {
          _this.currentPlaybackFrameIndex = numFrames - 1;
          _this.pause();
          return;
        }
        _this.onTrajectoryDataArrive(_this.getFrame(_this.currentPlaybackFrameIndex));
        _this.currentPlaybackFrameIndex++;
      }, 1);
    }
  }, {
    key: "abort",
    value: function abort() {
      window.clearInterval(this.playbackIntervalId);
      this.playbackIntervalId = 0;
      this.currentPlaybackFrameIndex = 0;
    }
  }, {
    key: "requestFrame",
    value: function requestFrame(startFrameNumber) {
      this.onTrajectoryDataArrive(this.getFrame(startFrameNumber));
    }
  }, {
    key: "requestFrameByTime",
    value: function requestFrameByTime(time) {
      var frameNumber = this.simulariumFile.getFrameIndexAtTime(time);

      // frameNumber is -1 if findIndex() above doesn't find a match
      if (frameNumber !== -1) {
        this.currentPlaybackFrameIndex = frameNumber;
        this.requestFrame(frameNumber);
      }
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(_fileName) {
      this.onTrajectoryFileInfoArrive(this.simulariumFile.getTrajectoryFileInfo());
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(_obj) {
      // not implemented
      return Promise.resolve();
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
}();