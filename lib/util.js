"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compareTimes = exports.checkAndSanitizePath = void 0;
exports.getFileExtension = getFileExtension;
exports.loadSimulariumFile = loadSimulariumFile;

var _JsonFileReader = _interopRequireDefault(require("./simularium/JsonFileReader"));

var _BinaryFileReader = _interopRequireDefault(require("./simularium/BinaryFileReader"));

var compareTimes = function compareTimes(time1, time2, timeStepSize) {
  var stepSizeFraction = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.01;

  /*
  Compares two time values in a series by seeing whether they are within some
  small fraction of the time step size.
   Params:
      time1:          Any number
      time2:          Any number
      timeStepSize:   The step size in a time series
   Returns:
      1 if time1 > time2
      -1 if time1 < time2
      0 if time1 ~= time2
  */
  var epsilon = timeStepSize * stepSizeFraction;
  if (time1 - epsilon > time2) return 1;
  if (time1 + epsilon < time2) return -1;
  return 0;
};

exports.compareTimes = compareTimes;

var checkAndSanitizePath = function checkAndSanitizePath(pathOrUrl) {
  /**
   * if given a url, return it. If given a path, return it in the form "/filename" (if it already
   * has a forward slash, also return it unmodified)
   */
  var isUrlRegEX = /(https?:\/\/)([\w\-])+\.{1}([a-zA-Z]{2,63})([\/\w-]*)*\/?\??([^#\n\r]*)?#?([^\n\r]*)/g;

  if (isUrlRegEX.test(pathOrUrl)) {
    return pathOrUrl;
  } else if (/\B\//g.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return "/".concat(pathOrUrl);
};

exports.checkAndSanitizePath = checkAndSanitizePath;

function getFileExtension(pathOrUrl) {
  // the file extension is considered to be all string contents after the last "."
  return pathOrUrl.substring(pathOrUrl.lastIndexOf(".") + 1, pathOrUrl.length) || pathOrUrl;
}

function loadSimulariumFile(file) {
  return _BinaryFileReader["default"].isBinarySimulariumFile(file).then(function (isBinary) {
    if (isBinary) {
      return file.arrayBuffer();
    } else {
      return file.text();
    }
  }).then(function (fileContents) {
    if (typeof fileContents === "string") {
      return new _JsonFileReader["default"](JSON.parse(fileContents));
    } else {
      // better be arraybuffer
      return new _BinaryFileReader["default"](fileContents);
    }
  });
}