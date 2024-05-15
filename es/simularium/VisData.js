import _toConsumableArray from "@babel/runtime/helpers/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { difference } from "lodash";
import { compareTimes } from "../util";
import * as util from "./ThreadUtil";
import { AGENT_OBJECT_KEYS } from "./types";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import { parseVisDataMessage } from "./VisDataParse";

// must be utf-8 encoded
var EOF_PHRASE = new TextEncoder().encode("\\EOFTHEFRAMEENDSHERE");
var VisData = /*#__PURE__*/function () {
  function VisData() {
    _classCallCheck(this, VisData);
    _defineProperty(this, "frameCache", void 0);
    _defineProperty(this, "frameDataCache", void 0);
    _defineProperty(this, "webWorker", void 0);
    _defineProperty(this, "frameToWaitFor", void 0);
    _defineProperty(this, "lockedForFrame", void 0);
    _defineProperty(this, "cacheFrame", void 0);
    _defineProperty(this, "netBuffer", void 0);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _defineProperty(this, "_dragAndDropFileInfo", void 0);
    _defineProperty(this, "timeStepSize", void 0);
    this.webWorker = null;
    if (util.ThreadUtil.browserSupportsWebWorkers()) {
      this.setupWebWorker();
    }
    this.frameCache = [];
    this.frameDataCache = [];
    this.cacheFrame = -1;
    this._dragAndDropFileInfo = null;
    this.frameToWaitFor = 0;
    this.lockedForFrame = false;
    this.netBuffer = new ArrayBuffer(0);
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
      this._dragAndDropFileInfo = null;
      this.frameToWaitFor = 0;
      this.lockedForFrame = false;
      this.netBuffer = new ArrayBuffer(0);
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

    // Add parsed frames to the cache and save the timestamp of the first frame
  }, {
    key: "addFramesToCache",
    value: function addFramesToCache(frames) {
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
    key: "parseAgentsFromLocalFileData",
    value: function parseAgentsFromLocalFileData(msg) {
      if (msg instanceof ArrayBuffer) {
        // Streamed binary data can have partial frames but
        // drag and drop is assumed to provide whole frames.
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
        var floatView = new Float32Array(msg);
        var fileNameSize = Math.ceil(floatView[1] / 4);
        var dataStart = (2 + fileNameSize) * 4;
        this.parseBinaryNetData(msg, dataStart);
        return;
      }
      this.parseAgentsFromVisDataMessage(msg);
    }
  }, {
    key: "parseBinaryNetData",
    value: function parseBinaryNetData(data, dataStart) {
      var eof = -1;

      // find last '/eof' signal in new data
      var byteView = new Uint8Array(data);

      // walk backwards in order to find the last eofPhrase in the data
      var index = byteView.length - EOF_PHRASE.length;
      for (; index > 0; index = index - 4) {
        var curr = byteView.subarray(index, index + EOF_PHRASE.length);
        if (curr.every(function (val, i) {
          return val === EOF_PHRASE[i];
        })) {
          eof = index;
          break;
        }
      }
      if (eof > dataStart) {
        var frame = data.slice(dataStart, eof);
        var tmp = new ArrayBuffer(this.netBuffer.byteLength + frame.byteLength);
        new Uint8Array(tmp).set(new Uint8Array(this.netBuffer));
        new Uint8Array(tmp).set(new Uint8Array(frame), this.netBuffer.byteLength);
        try {
          var frames = VisData.parseBinary(tmp);
          if (frames.frameDataArray.length > 0 && frames.frameDataArray[0].frameNumber === 0) {
            this.clearCache(); // new data has arrived
          }
          this.addFramesToCache(frames);
        } catch (err) {
          // TODO: There are frequent errors due to a race condition that
          // occurs when jumping to a new time if a partial frame is received
          // after netBuffer is cleared. We don't want this to trigger a front
          // end error, it's best to catch it here and just move on, as the
          // issue should be contained to just one frame. When binary messages
          // are updated to include frame num for partial frames in their header,
          // we can ensure that netBuffer is being combined with the matching
          // frame, and this try/catch can be removed
          console.log(err);
        }

        // Save remaining data for later processing
        var remainder = data.slice(eof + EOF_PHRASE.length);
        this.netBuffer = new ArrayBuffer(remainder.byteLength);
        new Uint8Array(this.netBuffer).set(new Uint8Array(remainder));
      } else {
        // Append the new data, and wait until eof
        var _frame = data.slice(dataStart, data.byteLength);
        var _tmp = new ArrayBuffer(this.netBuffer.byteLength + _frame.byteLength);
        new Uint8Array(_tmp).set(new Uint8Array(this.netBuffer));
        new Uint8Array(_tmp).set(new Uint8Array(_frame), this.netBuffer.byteLength);
        this.netBuffer = _tmp;
      }
    }

    // for use w/ a drag-and-drop trajectory file
    //  save a file for playback
    // will be caught by controller.changeFile(...).catch()
  }, {
    key: "cacheJSON",
    value: function cacheJSON(visDataMsg) {
      if (this.frameCache.length > 0) {
        throw new Error("cache not cleared before cacheing a new drag-and-drop file");
      }
      var frames = parseVisDataMessage(visDataMsg);
      this.addFramesToCache(frames);
    }
  }, {
    key: "dragAndDropFileInfo",
    get: function get() {
      if (!this._dragAndDropFileInfo) {
        return null;
      }
      return this._dragAndDropFileInfo;
    }

    // will be caught by controller.changeFile(...).catch()
    // TODO: check if this code is still used
    ,
    set: function set(fileInfo) {
      if (!fileInfo) return;
      // NOTE: this may be a temporary check as we're troubleshooting new file formats
      var missingIds = this.checkTypeMapping(fileInfo.typeMapping);
      if (missingIds.length) {
        var include = confirm("Your file typeMapping is missing names for the following type ids: ".concat(missingIds, ". Do you want to include them in the interactive interface?"));
        if (include) {
          missingIds.forEach(function (id) {
            fileInfo.typeMapping[id] = {
              name: id.toString()
            };
          });
        }
      }
      this._dragAndDropFileInfo = fileInfo;
    }
  }, {
    key: "checkTypeMapping",
    value: function checkTypeMapping(typeMappingFromFile) {
      if (!typeMappingFromFile) {
        throw new Error("data needs 'typeMapping' object to display agent controls");
      }
      var idsInFrameData = new Set();
      var idsInTypeMapping = Object.keys(typeMappingFromFile).map(Number);
      if (this.frameCache.length === 0) {
        console.log("no data to check type mapping against");
        return [];
      }
      this.frameCache.forEach(function (element) {
        element.map(function (agent) {
          return idsInFrameData.add(agent.type);
        });
      });
      var idsArr = _toConsumableArray(idsInFrameData).sort();
      return difference(idsArr, idsInTypeMapping).sort();
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
        var agentData = {
          //TODO use visType in AgentData and convert from "vis-type" here at parse time
          "vis-type": -1,
          instanceId: -1,
          type: -1,
          x: 0,
          y: 0,
          z: 0,
          xrot: 0,
          yrot: 0,
          zrot: 0,
          cr: 0,
          subpoints: []
        };
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
  }, {
    key: "parseBinary",
    value: function parseBinary(data) {
      var parsedAgentDataArray = [];
      var frameDataArray = [];
      var byteView = new Uint8Array(data);
      var length = byteView.length;
      var lastEOF = length - EOF_PHRASE.length;
      var end = 0;
      var start = 0;
      var frameDataView = new Float32Array(data);
      var _loop = function _loop() {
        // Find the next End of Frame signal
        for (; end < length; end = end + 4) {
          var curr = byteView.subarray(end, end + EOF_PHRASE.length);
          if (curr.every(function (val, i) {
            return val === EOF_PHRASE[i];
          })) {
            break;
          }
        }

        // contains Frame # | Time Stamp | # of Agents
        var frameInfoView = frameDataView.subarray(start / 4, (start + 12) / 4);

        // contains parsable agents
        var agentDataView = frameDataView.subarray((start + 12) / 4, end / 4);
        var parsedFrameData = {
          time: frameInfoView[1],
          frameNumber: frameInfoView[0]
        };
        var expectedNumAgents = frameInfoView[2];
        frameDataArray.push(parsedFrameData);

        // Parse the frameData
        var parsedAgentData = [];
        var nSubPointsIndex = AGENT_OBJECT_KEYS.findIndex(function (ele) {
          return ele === "nSubPoints";
        });
        var parseOneAgent = function parseOneAgent(agentArray) {
          return agentArray.reduce(function (agentData, cur, i) {
            var key;
            if (AGENT_OBJECT_KEYS[i]) {
              key = AGENT_OBJECT_KEYS[i];
              agentData[key] = cur;
            } else if (i < agentArray.length + agentData.nSubPoints) {
              agentData.subpoints.push(cur);
            }
            return agentData;
          }, {
            subpoints: []
          });
        };
        var dataIter = 0;
        var _loop2 = function _loop2() {
          var nSubPoints = agentDataView[dataIter + nSubPointsIndex];
          if (!Number.isInteger(nSubPoints) || !Number.isInteger(dataIter)) {
            throw new FrontEndError("Your data is malformed, non-integer value found for num-subpoints.", ErrorLevel.ERROR, "Number of Subpoints: <pre>".concat(nSubPoints, "</pre>"));
            return 1; // break
          }

          // each array length is variable based on how many subpoints the agent has
          var chunkLength = AGENT_OBJECT_KEYS.length + nSubPoints;
          var remaining = agentDataView.length - dataIter;
          if (remaining < chunkLength - 1) {
            var attemptedMapping = AGENT_OBJECT_KEYS.map(function (name, index) {
              return "".concat(name, ": ").concat(agentDataView[dataIter + index], "<br />");
            });
            // will be caught by controller.changeFile(...).catch()
            throw new FrontEndError("Your data is malformed, non-integer value found for num-subpoints.", ErrorLevel.ERROR, "Example attempt to parse your data: <pre>".concat(attemptedMapping.join(""), "</pre>"));
          }
          var agentSubSetArray = agentDataView.subarray(dataIter, dataIter + chunkLength);
          if (agentSubSetArray.length < AGENT_OBJECT_KEYS.length) {
            var _attemptedMapping = AGENT_OBJECT_KEYS.map(function (name, index) {
              return "".concat(name, ": ").concat(agentSubSetArray[index], "<br />");
            });
            // will be caught by controller.changeFile(...).catch()
            throw new FrontEndError("Your data is malformed, there are less entries than expected for this agent.", ErrorLevel.ERROR, "Example attempt to parse your data: <pre>".concat(_attemptedMapping.join(""), "</pre>"));
          }
          var agent = parseOneAgent(agentSubSetArray);
          parsedAgentData.push(agent);
          dataIter = dataIter + chunkLength;
        };
        while (dataIter < agentDataView.length) {
          if (_loop2()) break;
        }
        var numParsedAgents = parsedAgentData.length;
        if (numParsedAgents != expectedNumAgents) {
          throw new FrontEndError("Mismatch between expected num agents and parsed num agents, possible offset error");
        }
        parsedAgentDataArray.push(parsedAgentData);
        start = end + EOF_PHRASE.length;
        end = start;
      };
      while (end < lastEOF) {
        _loop();
      }
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