import _toConsumableArray from "@babel/runtime/helpers/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { compareTimes } from "../util";
import * as util from "./ThreadUtil";
import { AGENT_OBJECT_KEYS } from "./types";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import { parseVisDataMessage } from "./VisDataParse";
import { nullAgent } from "../constants";
var VisData = /*#__PURE__*/function () {
  function VisData() {
    _classCallCheck(this, VisData);
    _defineProperty(this, "frameCache", void 0);
    _defineProperty(this, "frameDataCache", void 0);
    _defineProperty(this, "enableCache", void 0);
    _defineProperty(this, "webWorker", void 0);
    _defineProperty(this, "frameToWaitFor", void 0);
    _defineProperty(this, "lockedForFrame", void 0);
    _defineProperty(this, "cacheFrame", void 0);
    _defineProperty(this, "timeStepSize", void 0);
    this.webWorker = null;
    if (util.ThreadUtil.browserSupportsWebWorkers()) {
      this.setupWebWorker();
    }
    this.frameCache = [];
    this.frameDataCache = [];
    this.cacheFrame = -1;
    this.enableCache = true;
    this.frameToWaitFor = 0;
    this.lockedForFrame = false;
    this.timeStepSize = 0;
  }

  //get time() { return this.cacheFrame < this.frameDataCache.length ? this.frameDataCache[this.cacheFrame] : -1 }
  _createClass(VisData, [{
    key: "setupWebWorker",
    value: function setupWebWorker() {
      var _this = this;
      this.webWorker = new Worker(new URL("../visGeometry/workers/visDataWorker", import.meta.url), {
        type: "module"
      });

      // event.data is of type ParsedBundle
      this.webWorker.onmessage = function (event) {
        if (!_this.enableCache) {
          _this.frameDataCache = _toConsumableArray(event.data.frameDataArray);
          _this.frameCache = _toConsumableArray(event.data.parsedAgentDataArray);
          return;
        }
        Array.prototype.push.apply(_this.frameDataCache, event.data.frameDataArray);
        Array.prototype.push.apply(_this.frameCache, event.data.parsedAgentDataArray);
      };
    }
  }, {
    key: "currentFrameData",
    get: function get() {
      if (this.frameDataCache.length > 0) {
        if (this.cacheFrame < 0) {
          return this.frameDataCache[0];
        } else if (this.cacheFrame >= this.frameDataCache.length) {
          return this.frameDataCache[this.frameDataCache.length - 1];
        } else {
          return this.frameDataCache[this.cacheFrame];
        }
      }
      return {
        frameNumber: 0,
        time: 0
      };
    }

    /**
     *   Functions to check update
     * */
  }, {
    key: "hasLocalCacheForTime",
    value: function hasLocalCacheForTime(time) {
      // TODO: debug compareTimes
      if (!this.enableCache) {
        return false;
      }
      if (this.frameDataCache.length < 1) {
        return false;
      }
      var firstFrameTime = this.frameDataCache[0].time;
      var lastFrameTime = this.frameDataCache[this.frameDataCache.length - 1].time;
      var notLessThanFirstFrameTime = compareTimes(time, firstFrameTime, this.timeStepSize) !== -1;
      var notGreaterThanLastFrameTime = compareTimes(time, lastFrameTime, this.timeStepSize) !== 1;
      return notLessThanFirstFrameTime && notGreaterThanLastFrameTime;
    }
  }, {
    key: "gotoTime",
    value: function gotoTime(time) {
      var _this2 = this;
      this.cacheFrame = -1;

      // Find the index of the frame that has the time matching our target time
      var frameNumber = this.frameDataCache.findIndex(function (frameData) {
        return compareTimes(frameData.time, time, _this2.timeStepSize) === 0;
      });

      // frameNumber is -1 if findIndex() above doesn't find a match
      if (frameNumber !== -1) {
        this.cacheFrame = frameNumber;
      }
    }
  }, {
    key: "atLatestFrame",
    value: function atLatestFrame() {
      if (this.cacheFrame === -1 && this.frameCache.length > 0) {
        return false;
      }
      return this.cacheFrame >= this.frameCache.length - 1;
    }
  }, {
    key: "currentFrame",
    value: function currentFrame() {
      if (this.frameCache.length === 0) {
        return [];
      } else if (this.cacheFrame === -1) {
        this.cacheFrame = 0;
        return this.frameCache[0];
      }
      return this.cacheFrame < this.frameCache.length ? this.frameCache[this.cacheFrame] : Array();
    }
  }, {
    key: "gotoNextFrame",
    value: function gotoNextFrame() {
      if (!this.atLatestFrame()) {
        this.cacheFrame = this.cacheFrame + 1;
      }
    }

    /**
     * Data management
     * */
  }, {
    key: "WaitForFrame",
    value: function WaitForFrame(frameNumber) {
      this.frameToWaitFor = frameNumber;
      this.lockedForFrame = true;
    }
  }, {
    key: "clearCache",
    value: function clearCache() {
      this.frameCache = [];
      this.frameDataCache = [];
      this.cacheFrame = -1;
      this.frameToWaitFor = 0;
      this.lockedForFrame = false;
    }
  }, {
    key: "clearForNewTrajectory",
    value: function clearForNewTrajectory() {
      this.clearCache();
    }
  }, {
    key: "cancelAllWorkers",
    value: function cancelAllWorkers() {
      // we need to be able to terminate any queued work in the worker during trajectory changeovers
      if (util.ThreadUtil.browserSupportsWebWorkers() && this.webWorker !== null) {
        this.webWorker.terminate();
        this.setupWebWorker();
      }
    }
  }, {
    key: "setCacheEnabled",
    value: function setCacheEnabled(cacheEnabled) {
      this.enableCache = cacheEnabled;
    }

    // Add parsed frames to the cache and save the timestamp of the first frame
  }, {
    key: "addFramesToCache",
    value: function addFramesToCache(frames) {
      if (!this.enableCache) {
        this.frameDataCache = _toConsumableArray(frames.frameDataArray);
        this.frameCache = _toConsumableArray(frames.parsedAgentDataArray);
        return;
      }
      Array.prototype.push.apply(this.frameDataCache, frames.frameDataArray);
      Array.prototype.push.apply(this.frameCache, frames.parsedAgentDataArray);
    }
  }, {
    key: "parseAgentsFromVisDataMessage",
    value: function parseAgentsFromVisDataMessage(msg) {
      /**
       *   visDataMsg = {
       *       ...
       *       bundleSize : Number
       *       bundleStart : Number
       *       bundleData : [
       *           {data : Number[], frameNumber : Number, time : Number},
       *           {...}, {...}, ...
       *       ]
       *   }
       */

      var visDataMsg = msg;
      if (this.lockedForFrame === true) {
        if (visDataMsg.bundleData[0].frameNumber !== this.frameToWaitFor) {
          // This object is waiting for a frame with a specified frame number
          //  and  the arriving frame didn't match it
          return;
        } else {
          this.lockedForFrame = false;
          this.frameToWaitFor = 0;
        }
      }
      if (util.ThreadUtil.browserSupportsWebWorkers() && this.webWorker !== null) {
        this.webWorker.postMessage(visDataMsg);
      } else {
        var frames = parseVisDataMessage(visDataMsg);
        this.addFramesToCache(frames);
      }
    }
  }, {
    key: "parseAgentsFromFrameData",
    value: function parseAgentsFromFrameData(msg) {
      if (msg instanceof ArrayBuffer) {
        var frames = VisData.parseOneBinaryFrame(msg);
        if (frames.frameDataArray.length > 0 && frames.frameDataArray[0].frameNumber === 0) {
          this.clearCache(); // new data has arrived
        }
        this.addFramesToCache(frames);
        return;
      }

      // handle VisDataMessage
      this.parseAgentsFromVisDataMessage(msg);
    }
  }, {
    key: "parseAgentsFromNetData",
    value: function parseAgentsFromNetData(msg) {
      if (msg instanceof ArrayBuffer) {
        // Streamed binary file data messages contain message type, file name
        // length, and file name in header, which local file data messages
        // do not. Once those parts are stripped out, processing is the same
        var floatView = new Float32Array(msg);
        var fileNameSize = Math.ceil(floatView[1] / 4);
        var dataStart = (2 + fileNameSize) * 4;
        msg = msg.slice(dataStart);
      }
      this.parseAgentsFromFrameData(msg);
    }
  }], [{
    key: "parseOneBinaryFrame",
    value: function parseOneBinaryFrame(data) {
      var parsedAgentDataArray = [];
      var frameDataArray = [];
      var floatView = new Float32Array(data);
      var intView = new Uint32Array(data);
      var parsedFrameData = {
        time: floatView[1],
        frameNumber: floatView[0]
      };
      var expectedNumAgents = intView[2];
      frameDataArray.push(parsedFrameData);
      var AGENTS_OFFSET = 3;
      var parsedAgentData = [];
      var j = AGENTS_OFFSET;
      for (var i = 0; i < expectedNumAgents; i++) {
        var agentData = nullAgent();
        for (var k = 0; k < AGENT_OBJECT_KEYS.length; ++k) {
          agentData[AGENT_OBJECT_KEYS[k]] = floatView[j++];
        }
        var nSubPoints = agentData["nSubPoints"];
        if (!Number.isInteger(nSubPoints)) {
          throw new FrontEndError("Your data is malformed, non-integer value found for num-subpoints.", ErrorLevel.ERROR, "Number of Subpoints: <pre>".concat(nSubPoints, "</pre>"));
          break;
        }
        // now read sub points.
        for (var _k = 0; _k < nSubPoints; _k++) {
          agentData.subpoints.push(floatView[j++]);
        }
        parsedAgentData.push(agentData);
      }
      parsedAgentDataArray.push(parsedAgentData);
      return {
        parsedAgentDataArray: parsedAgentDataArray,
        frameDataArray: frameDataArray
      };
    }
  }]);
  return VisData;
}();
export { VisData };
export default VisData;