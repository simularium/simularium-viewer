import JsonFileReader from "./simularium/JsonFileReader";
import BinaryFileReader from "./simularium/BinaryFileReader";
import { AGENT_OBJECT_KEYS } from "./simularium/types";
import { nullAgent } from "./constants";
import { FrontEndError } from "./simularium";
export var compareTimes = function compareTimes(time1, time2, timeStepSize) {
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
export var checkAndSanitizePath = function checkAndSanitizePath(pathOrUrl) {
  /**
   * if given a url, return it. If given a path, return it in the form "/filename" (if it already
   * has a forward slash, also return it unmodified)
   */
  var isUrlRegEX = /(https?:\/\/)([\w\-])+\.{1}([a-zA-Z]{2,63})([\/\w-]*)*\/?\??([^#\n\r]*)?#?([^\n\r]*)/g;
  if (isUrlRegEX.test(pathOrUrl)) {
    var url = pathOrUrl;
    if (url.includes("dropbox")) {
      url = url.replace("www.dropbox.com", "dl.dropboxusercontent.com");
    }
    return url;
  } else if (/\B\//g.test(pathOrUrl)) {
    return pathOrUrl;
  }
  return "/".concat(pathOrUrl);
};
export function getFileExtension(pathOrUrl) {
  // the file extension is considered to be all string contents after the last "."
  return pathOrUrl.substring(pathOrUrl.lastIndexOf(".") + 1, pathOrUrl.length) || pathOrUrl;
}
export function loadSimulariumFile(file) {
  return BinaryFileReader.isBinarySimulariumFile(file).then(function (isBinary) {
    if (isBinary) {
      return file.arrayBuffer();
    } else {
      return file.text();
    }
  }).then(function (fileContents) {
    if (typeof fileContents === "string") {
      return new JsonFileReader(JSON.parse(fileContents));
    } else {
      // better be arraybuffer
      return new BinaryFileReader(fileContents);
    }
  });
}
export var nullCachedFrame = function nullCachedFrame() {
  return {
    data: new ArrayBuffer(0),
    frameNumber: -1,
    time: -1,
    agentCount: -1,
    size: -1
  };
};
export var getAgentDataFromBuffer = function getAgentDataFromBuffer(view, offset) {
  // Check if the buffer has enough data for the AGENT_OBJECT_KEYS
  if (offset + AGENT_OBJECT_KEYS.length > view.length) {
    throw new FrontEndError("Invalid offset: Not enough data in the buffer for agent data.");
  }
  var agentData = nullAgent();
  for (var i = 0; i < AGENT_OBJECT_KEYS.length; i++) {
    agentData[AGENT_OBJECT_KEYS[i]] = view[offset + i];
  }
  var nSubPoints = agentData["nSubPoints"];

  // Check if the buffer has enough data for subpoints
  var subpointsStart = offset + AGENT_OBJECT_KEYS.length;
  var subpointsEnd = subpointsStart + nSubPoints;
  if (subpointsEnd > view.length) {
    throw new FrontEndError("Invalid offset: Not enough data in the buffer for subpoints.");
  }
  agentData.subpoints = Array.from(view.subarray(offset + AGENT_OBJECT_KEYS.length, offset + AGENT_OBJECT_KEYS.length + nSubPoints));
  return agentData;
};
export var getNextAgentOffset = function getNextAgentOffset(view, currentOffset) {
  var nSubPoints = view[currentOffset + AGENT_OBJECT_KEYS.length - 1];
  return currentOffset + AGENT_OBJECT_KEYS.length + nSubPoints;
};