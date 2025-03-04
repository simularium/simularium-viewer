import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { noop } from "lodash";
import { nullCachedFrame } from "../util.js";
import { parseVisDataMessage } from "./VisDataParse.js";
import { VisDataCache } from "./VisDataCache.js";
import { ErrorLevel, FrontEndError } from "./FrontEndError.js";
import { BYTE_SIZE_64_BIT_NUM } from "../constants.js";
var VisData = /*#__PURE__*/function () {
  function VisData() {
    _classCallCheck(this, VisData);
    _defineProperty(this, "frameCache", void 0);
    _defineProperty(this, "frameToWaitFor", void 0);
    _defineProperty(this, "lockedForFrame", void 0);
    _defineProperty(this, "currentFrameNumber", void 0);
    _defineProperty(this, "timeStepSize", void 0);
    _defineProperty(this, "onError", void 0);
    this.currentFrameNumber = -1;
    this.frameCache = new VisDataCache();
    this.frameToWaitFor = 0;
    this.lockedForFrame = false;
    this.timeStepSize = 0;
    this.onError = noop;
  }
  return _createClass(VisData, [{
    key: "setOnError",
    value: function setOnError(onError) {
      this.onError = onError;
    }
  }, {
    key: "currentFrameData",
    get: function get() {
      if (!this.frameCache.hasFrames()) {
        return nullCachedFrame();
      }
      if (this.currentFrameNumber < 0) {
        var firstFrame = this.frameCache.getFirstFrame();
        if (firstFrame) {
          this.currentFrameNumber = firstFrame.frameNumber;
          return firstFrame;
        }
      } else {
        var frame = this.frameCache.getFrameAtFrameNumber(this.currentFrameNumber);
        if (frame !== undefined) {
          return frame;
        }
      }
      return nullCachedFrame();
    }

    /**
     *   Functions to check update
     * */
  }, {
    key: "hasLocalCacheForTime",
    value: function hasLocalCacheForTime(time) {
      return this.frameCache.containsTime(time);
    }
  }, {
    key: "gotoTime",
    value: function gotoTime(time) {
      var _this$frameCache$getF;
      var frameNumber = (_this$frameCache$getF = this.frameCache.getFrameAtTime(time)) === null || _this$frameCache$getF === void 0 ? void 0 : _this$frameCache$getF.frameNumber;
      if (frameNumber !== undefined) {
        this.currentFrameNumber = frameNumber;
      }
    }
  }, {
    key: "atLatestFrame",
    value: function atLatestFrame() {
      return this.currentFrameNumber >= this.frameCache.getLastFrameNumber();
    }
  }, {
    key: "gotoNextFrame",
    value: function gotoNextFrame() {
      if (!this.atLatestFrame()) {
        this.currentFrameNumber += 1;
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
      this.frameCache.clear();
      this.currentFrameNumber = -1;
      this.frameToWaitFor = 0;
      this.lockedForFrame = false;
    }
  }, {
    key: "clearForNewTrajectory",
    value: function clearForNewTrajectory() {
      this.clearCache();
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
      var parsedMsg = parseVisDataMessage(visDataMsg);
      if (this.frameCache.cacheSizeLimited && parsedMsg.size > this.frameCache.maxSize) {
        this.frameExceedsCacheSizeError(parsedMsg.size);
        return;
      }
      this.addFrameToCache(parsedMsg);
    }
  }, {
    key: "parseAgentsFromFrameData",
    value: function parseAgentsFromFrameData(msg) {
      if (msg instanceof ArrayBuffer) {
        var frame = VisData.parseOneBinaryFrame(msg);
        if (frame.frameNumber === 0) {
          this.clearCache(); // new data has arrived
        }
        this.addFrameToCache(frame);
        return;
      }
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
  }, {
    key: "addFrameToCache",
    value: function addFrameToCache(frame) {
      if (this.frameCache.cacheSizeLimited && frame.size > this.frameCache.maxSize) {
        this.frameExceedsCacheSizeError(frame.size);
        return;
      }
      this.frameCache.addFrame(frame);
    }
  }, {
    key: "frameExceedsCacheSizeError",
    value: function frameExceedsCacheSizeError(frameSize) {
      this.onError(new FrontEndError("Frame size exceeds cache size: ".concat(frameSize, " > ").concat(this.frameCache.maxSize), ErrorLevel.ERROR));
    }
  }], [{
    key: "parseOneBinaryFrame",
    value: function parseOneBinaryFrame(data) {
      var floatView = new Float32Array(data);
      var intView = new Uint32Array(data);
      var frameData = {
        data: data,
        frameNumber: floatView[0],
        time: floatView[1],
        agentCount: intView[2],
        size: 0
      };
      var numMetadataFields = Object.keys(frameData).length - 1; // exclude "data" field
      frameData.size = data.byteLength + numMetadataFields * BYTE_SIZE_64_BIT_NUM;
      return frameData;
    }
  }]);
}();
export { VisData };
export default VisData;