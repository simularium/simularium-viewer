function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import * as util from "./ThreadUtil";

var VisData =
/*#__PURE__*/
function () {
  _createClass(VisData, null, [{
    key: "parse",

    /**
     *   Parses a stream of data sent from the backend
     *
     *   To minimize bandwidth, traits/objects are not packed
     *   1-1; what arrives is an array of float values
     *
     *   For instance for:
     *   entity = (
     *        trait1 : 4,
     *        trait2 : 5,
     *        trait3 : 6,
     *    ) ...
     *
     *   what arrives will be:
     *       [...,4,5,6,...]
     *
     *   The traits are assumed to be variable in length,
     *   and the alorithm to decode them needs to the reverse
     *   of the algorithm that packed them on the backend
     *
     *   This is more convuluted than sending the JSON objects themselves,
     *   however these frames arrive multiple times per second. Even a naive
     *   packing reduces the packet size by ~50%, reducing how much needs to
     *   paid for network bandwith (and improving the quality & responsiveness
     *   of the application, since network latency is a major bottle-neck)
     * */
    value: function parse(visDataMsg) {
      var parsedAgentDataArray = [];
      var frameDataArray = [];
      visDataMsg.bundleData.forEach(function (frame) {
        // IMPORTANT: Order of this array needs to perfectly match the incoming data.
        var agentObjectKeys = ["vis-type", "type", "x", "y", "z", "xrot", "yrot", "zrot", "cr", "nSubPoints"];
        var visData = frame.data;
        var parsedAgentData = [];
        var nSubPointsIndex = agentObjectKeys.findIndex(function (ele) {
          return ele === "nSubPoints";
        });

        var parseOneAgent = function parseOneAgent(agentArray) {
          return agentArray.reduce(function (agentData, cur, i) {
            var key;

            if (agentObjectKeys[i]) {
              key = agentObjectKeys[i];
              agentData[key] = cur;
            } else if (i < agentArray.length + agentData.nSubPoints) {
              agentData.subpoints.push(cur);
            }

            return agentData;
          }, {
            subpoints: []
          });
        };

        while (visData.length) {
          var nSubPoints = visData[nSubPointsIndex];
          var chunckLength = agentObjectKeys.length + nSubPoints; // each array length is varible based on how many subpoints the agent has

          if (visData.length < chunckLength) {
            throw Error("malformed data: too few entries");
          }

          var agentSubSetArray = visData.splice(0, chunckLength); // cut off the array of 1 agent data from front of the array;

          if (agentSubSetArray.length < agentObjectKeys.length) {
            throw Error("malformed data: indexing off");
          }

          parsedAgentData.push(parseOneAgent(agentSubSetArray));
        }

        var frameData = {
          time: frame.time,
          frameNumber: frame.frameNumber
        };
        parsedAgentDataArray.push(parsedAgentData);
        frameDataArray.push(frameData);
      });
      return {
        parsedAgentDataArray: parsedAgentDataArray,
        frameDataArray: frameDataArray
      };
    }
  }]);

  function VisData() {
    var _this = this;

    _classCallCheck(this, VisData);

    _defineProperty(this, "frameCache", void 0);

    _defineProperty(this, "frameDataCache", void 0);

    _defineProperty(this, "webWorker", void 0);

    _defineProperty(this, "frameToWaitFor", void 0);

    _defineProperty(this, "lockedForFrame", void 0);

    _defineProperty(this, "cacheFrame", void 0);

    if (util.ThreadUtil.browserSupportsWebWorkers()) {
      this.webWorker = util.ThreadUtil.createWebWorkerFromFunction(this.convertVisDataWorkFunctionToString());

      this.webWorker.onmessage = function (event) {
        Array.prototype.push.apply(_this.frameDataCache, event.data.frameDataArray);
        Array.prototype.push.apply(_this.frameCache, event.data.parsedAgentDataArray);
      };
    } else {
      this.webWorker = null;
    }

    this.frameCache = [];
    this.frameDataCache = [];
    this.cacheFrame = -1;
    this.frameToWaitFor = 0;
    this.lockedForFrame = false;
  } //get time() { return this.cacheFrame < this.frameDataCache.length ? this.frameDataCache[this.cacheFrame] : -1 }


  _createClass(VisData, [{
    key: "hasLocalCacheForTime",

    /**
     *   Functions to check update
     * */
    value: function hasLocalCacheForTime(timeNs) {
      if (this.frameDataCache.length > 0 && timeNs === 0) {
        return true;
      } else if (this.frameDataCache.length < 2) {
        return false;
      }

      return this.frameDataCache[0].time <= timeNs && this.frameDataCache[this.frameDataCache.length - 1].time >= timeNs;
    }
  }, {
    key: "gotoTime",
    value: function gotoTime(timeNs) {
      this.cacheFrame = -1;

      for (var frame = 0, numFrames = this.frameDataCache.length; frame < numFrames; frame++) {
        var frameTime = this.frameDataCache[frame].time;

        if (timeNs < frameTime) {
          this.cacheFrame = Math.max(frame - 1, 0);
          break;
        }
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
      this.cacheFrame = 0;
    }
  }, {
    key: "parseAgentsFromNetData",
    value: function parseAgentsFromNetData(visDataMsg) {
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
        var frames = VisData.parse(visDataMsg);
        Array.prototype.push.apply(this.frameDataCache, frames.frameDataArray);
        Array.prototype.push.apply(this.frameCache, frames.parsedAgentDataArray);
      }
    } // for use w/ a drag-and-drop trajectory file
    //  save a file for playback

  }, {
    key: "cacheJSON",
    value: function cacheJSON(visDataMsg) {
      if (this.frameCache.length > 0) {
        throw Error("cache not cleared before cacheing a new drag-and-drop file");
        return;
      }

      var frames = VisData.parse(visDataMsg);
      Array.prototype.push.apply(this.frameDataCache, frames.frameDataArray);
      Array.prototype.push.apply(this.frameCache, frames.parsedAgentDataArray);
    }
  }, {
    key: "dragAndDropFileInfo",
    value: function dragAndDropFileInfo() {
      var max = [0, 0, 0];
      var min = [0, 0, 0];

      if (this.frameCache.length === 0) {
        throw Error("No data in cache for drag-and-drop file");
        return {
          boxSizeX: 0,
          boxSizeY: 0,
          boxSizeZ: 0,
          totalDuration: 1,
          timeStepSize: 1
        };
      }

      this.frameCache.forEach(function (element) {
        var radius = Math.max.apply(Math, element.map(function (agent) {
          return agent.cr;
        })) * 1.1;
        var maxx = Math.max.apply(Math, element.map(function (agent) {
          return agent.x;
        }));
        var maxy = Math.max.apply(Math, element.map(function (agent) {
          return agent.y;
        }));
        var maxz = Math.max.apply(Math, element.map(function (agent) {
          return agent.z;
        }));
        var minx = Math.min.apply(Math, element.map(function (agent) {
          return agent.x;
        }));
        var miny = Math.min.apply(Math, element.map(function (agent) {
          return agent.y;
        }));
        var minz = Math.min.apply(Math, element.map(function (agent) {
          return agent.z;
        }));
        max[0] = Math.max(max[0], 2 * maxx + radius);
        max[1] = Math.max(max[1], 2 * maxy + radius);
        max[2] = Math.max(max[2], 2 * maxz + radius);
        min[0] = Math.min(max[0], 2 * minx - radius);
        min[1] = Math.min(max[1], 2 * miny - radius);
        min[2] = Math.min(max[2], 2 * minz - radius);
      });
      var timeStepSize = this.frameDataCache.length > 1 ? this.frameDataCache[1].time - this.frameDataCache[0].time : 1;
      var totalDuration = this.frameDataCache[this.frameCache.length - 1].frameNumber * timeStepSize;
      return {
        boxSizeX: max[0] - min[0],
        boxSizeY: max[1] - min[0],
        boxSizeZ: max[2] - min[2],
        totalDuration: totalDuration,
        timeStepSize: timeStepSize
      };
    }
  }, {
    key: "convertVisDataWorkFunctionToString",
    value: function convertVisDataWorkFunctionToString() {
      return "function visDataWorkerFunc() {\n        self.addEventListener('message', (e) => {\n            const visDataMsg = e.data;\n            const {\n                frameDataArray,\n                parsedAgentDataArray,\n            } = ".concat(VisData.parse, "(visDataMsg)\n\n            postMessage({\n                frameDataArray,\n                parsedAgentDataArray,\n            });\n        }, false);\n        }");
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
  }]);

  return VisData;
}();

export { VisData };
export default VisData;