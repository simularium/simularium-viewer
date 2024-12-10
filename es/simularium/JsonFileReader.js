import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { FrontEndError } from "./FrontEndError.js";
import { compareTimes } from "../util.js";
var JsonFileReader = /*#__PURE__*/function () {
  function JsonFileReader(fileContents) {
    _classCallCheck(this, JsonFileReader);
    _defineProperty(this, "simulariumFile", void 0);
    this.simulariumFile = fileContents;
    var spatialData = this.simulariumFile.spatialData;
    if (!spatialData) {
      throw new FrontEndError("Simularium files need 'spatialData' array");
    }
    spatialData.bundleData.sort(function (a, b) {
      return a.frameNumber - b.frameNumber;
    });
  }
  return _createClass(JsonFileReader, [{
    key: "getTrajectoryFileInfo",
    value: function getTrajectoryFileInfo() {
      return this.simulariumFile.trajectoryInfo;
    }
  }, {
    key: "getNumFrames",
    value: function getNumFrames() {
      return this.simulariumFile.spatialData.bundleSize;
    }
  }, {
    key: "getFrameIndexAtTime",
    value: function getFrameIndexAtTime(time) {
      var timeStepSize = this.simulariumFile.trajectoryInfo.timeStepSize;
      var bundleData = this.simulariumFile.spatialData.bundleData;
      // Find the index of the frame that has the time matching our target time
      var frameNumber = bundleData.findIndex(function (bundleData) {
        return compareTimes(bundleData.time, time, timeStepSize) === 0;
      });
      return frameNumber;
    }
  }, {
    key: "getFrame",
    value: function getFrame(theFrameNumber) {
      return this.simulariumFile.spatialData.bundleData[theFrameNumber];
    }
  }, {
    key: "getPlotData",
    value: function getPlotData() {
      return this.simulariumFile.plotData.data;
    }
  }, {
    key: "getAsBlob",
    value: function getAsBlob() {
      return new Blob([JSON.stringify(this.simulariumFile)], {
        type: "text/plain;charset=utf-8"
      });
    }
  }]);
}();
export { JsonFileReader as default };