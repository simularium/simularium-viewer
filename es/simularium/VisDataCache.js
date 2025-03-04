import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { compareTimes } from "../util.js";
var VisDataCache = /*#__PURE__*/function () {
  function VisDataCache(settings) {
    _classCallCheck(this, VisDataCache);
    _defineProperty(this, "head", void 0);
    _defineProperty(this, "tail", void 0);
    _defineProperty(this, "numFrames", void 0);
    _defineProperty(this, "size", void 0);
    _defineProperty(this, "_maxSize", void 0);
    _defineProperty(this, "_cacheEnabled", void 0);
    /**
     * maxSize of negative one means no limit on cache size
     * disabledCache means only one frame will be stored at a time
     * maxSize > 0 and cacheEnabled will cause cache to trim frames
     * when incoming frame pushes size over max
     */
    this.head = null;
    this.tail = null;
    this.numFrames = 0;
    this.size = 0;
    this._maxSize = Infinity;
    this._cacheEnabled = true;
    if (settings) {
      this.changeSettings(settings);
    }
  }
  return _createClass(VisDataCache, [{
    key: "changeSettings",
    value: function changeSettings(options) {
      var maxSize = options.maxSize,
        cacheEnabled = options.cacheEnabled;
      if (cacheEnabled !== undefined) {
        this._cacheEnabled = cacheEnabled;
      }
      if (maxSize !== undefined) {
        this._maxSize = maxSize;
      }
    }
  }, {
    key: "maxSize",
    get: function get() {
      return this._maxSize;
    }
  }, {
    key: "cacheEnabled",
    get: function get() {
      return this._cacheEnabled;
    }
  }, {
    key: "cacheSizeLimited",
    get: function get() {
      return this._maxSize !== Infinity;
    }
  }, {
    key: "hasFrames",
    value: function hasFrames() {
      return this.numFrames > 0 && this.head !== null && this.tail !== null;
    }

    /**
     * Walks the cache looking for node that satisfies condition
     * returns the node if found, otherwise returns null,
     * starts at head if firstNode is not provided.
     */
  }, {
    key: "findInLinkedList",
    value: function findInLinkedList(condition, firstNode) {
      var currentNode = firstNode || this.head;
      while (currentNode) {
        if (condition(currentNode)) {
          return currentNode;
        }
        currentNode = currentNode.next;
      }
      return undefined;
    }
  }, {
    key: "containsTime",
    value: function containsTime(time) {
      if (compareTimes(time, this.getFirstFrameTime(), 0.1) === -1 || compareTimes(time, this.getLastFrameTime(), 0.1) === 1) {
        return false;
      }
      if (time < this.getFirstFrameTime() || time > this.getLastFrameTime()) {
        return false;
      }
      return !!this.findInLinkedList(function (node) {
        return node.data.time === time;
      });
    }
  }, {
    key: "containsFrameAtFrameNumber",
    value: function containsFrameAtFrameNumber(frameNumber) {
      if (frameNumber < this.getFirstFrameNumber() || frameNumber > this.getLastFrameNumber()) {
        return false;
      }
      return !!this.findInLinkedList(function (node) {
        return node.data.frameNumber === frameNumber;
      });
    }
  }, {
    key: "getFirstFrame",
    value: function getFirstFrame() {
      var _this$head;
      return (_this$head = this.head) === null || _this$head === void 0 ? void 0 : _this$head.data;
    }
  }, {
    key: "getFirstFrameNumber",
    value: function getFirstFrameNumber() {
      var _this$head2;
      return ((_this$head2 = this.head) === null || _this$head2 === void 0 ? void 0 : _this$head2.data.frameNumber) || -1;
    }
  }, {
    key: "getFirstFrameTime",
    value: function getFirstFrameTime() {
      var _this$head3;
      return ((_this$head3 = this.head) === null || _this$head3 === void 0 ? void 0 : _this$head3.data.time) || -1;
    }
  }, {
    key: "getLastFrame",
    value: function getLastFrame() {
      var _this$tail;
      return (_this$tail = this.tail) === null || _this$tail === void 0 ? void 0 : _this$tail.data;
    }
  }, {
    key: "getLastFrameNumber",
    value: function getLastFrameNumber() {
      var _this$tail2;
      return ((_this$tail2 = this.tail) === null || _this$tail2 === void 0 ? void 0 : _this$tail2.data.frameNumber) || -1;
    }
  }, {
    key: "getLastFrameTime",
    value: function getLastFrameTime() {
      var _this$tail3;
      return ((_this$tail3 = this.tail) === null || _this$tail3 === void 0 ? void 0 : _this$tail3.data.time) || -1;
    }
  }, {
    key: "getFrameAtCondition",
    value: function getFrameAtCondition(condition) {
      if (!this.head) {
        return;
      }
      var frame = this.findInLinkedList(condition);
      if (frame) {
        return frame.data;
      }
    }
  }, {
    key: "getFrameAtTime",
    value: function getFrameAtTime(time) {
      var frame = this.getFrameAtCondition(function (node) {
        return compareTimes(node.data.time, time, 0) === 0;
      });
      return frame ? frame : undefined;
    }
  }, {
    key: "getFrameAtFrameNumber",
    value: function getFrameAtFrameNumber(frameNumber) {
      var frame = this.getFrameAtCondition(function (node) {
        return node.data["frameNumber"] === frameNumber;
      });
      return frame ? frame : undefined;
    }
  }, {
    key: "assignSingleFrameToCache",
    value: function assignSingleFrameToCache(data) {
      var newNode = {
        data: data,
        next: null,
        prev: null
      };
      this.head = newNode;
      this.tail = newNode;
      this.size = data.size;
      this.numFrames = 1;
    }
  }, {
    key: "addFrameToEndOfCache",
    value: function addFrameToEndOfCache(data) {
      var newNode = {
        data: data,
        next: null,
        prev: null
      };
      if (!this.hasFrames()) {
        this.assignSingleFrameToCache(data);
        return;
      }
      if (this.tail) {
        newNode.prev = this.tail;
        this.tail.next = newNode;
        this.tail = newNode;
        this.numFrames++;
        this.size += data.size;
        if (this.size > this._maxSize) {
          this.trimCache();
        }
      }
    }
  }, {
    key: "addFrame",
    value: function addFrame(data) {
      if (this.size + data.size > this._maxSize) {
        this.trimCache(data.size);
      }
      if (this.hasFrames() && this._cacheEnabled) {
        this.addFrameToEndOfCache(data);
        return;
      }
      this.assignSingleFrameToCache(data);
    }

    // generalized to remove any node, but in theory
    // we should only be removing the head when we trim the cache
    // under current assumptions
  }, {
    key: "removeNode",
    value: function removeNode(node) {
      if (this.numFrames === 0 || !this.head || !this.tail) {
        return;
      }
      if (this.numFrames === 1 && this.head === this.tail) {
        this.clear();
        return;
      }
      if (node === this.head && node.next !== null) {
        this.head = node.next;
        this.head.prev = null;
      } else if (node === this.tail && node.prev !== null) {
        this.tail = node.prev;
        this.tail.next = null;
      } else if (node.prev !== null && node.next !== null) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
      }
      this.numFrames--;
      this.size -= node.data.size;
    }
  }, {
    key: "trimCache",
    value: function trimCache(incomingDataSize) {
      while (this.hasFrames() && this.size + (incomingDataSize || 0) > this._maxSize && this.head !== null) {
        this.removeNode(this.head);
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = null;
      this.tail = null;
      this.numFrames = 0;
      this.size = 0;
    }
  }]);
}();
export { VisDataCache };