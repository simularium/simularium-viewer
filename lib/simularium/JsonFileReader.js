"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _FrontEndError = require("./FrontEndError");

var _util = require("../util");

var JsonFileReader = /*#__PURE__*/function () {
  function JsonFileReader(fileContents) {
    (0, _classCallCheck2["default"])(this, JsonFileReader);
    (0, _defineProperty2["default"])(this, "simulariumFile", void 0);
    this.simulariumFile = fileContents;
    var spatialData = this.simulariumFile.spatialData;

    if (!spatialData) {
      throw new _FrontEndError.FrontEndError("Simularium files need 'spatialData' array");
    }

    spatialData.bundleData.sort(function (a, b) {
      return a.frameNumber - b.frameNumber;
    });
  }

  (0, _createClass2["default"])(JsonFileReader, [{
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
      var bundleData = this.simulariumFile.spatialData.bundleData; // Find the index of the frame that has the time matching our target time

      var frameNumber = bundleData.findIndex(function (bundleData) {
        return (0, _util.compareTimes)(bundleData.time, time, timeStepSize) === 0;
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
      return this.simulariumFile.plotData;
    }
  }]);
  return JsonFileReader;
}();

exports["default"] = JsonFileReader;