"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.TaskQueue = exports.REASON_CANCELLED = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var MAX_ACTIVE_WORKERS = 4;
var REASON_CANCELLED = "Cancelled"; // class is exported mainly for testing convenience.
// a "global" instance is also provided as the default export below.

exports.REASON_CANCELLED = REASON_CANCELLED;

var TaskQueue = /*#__PURE__*/function () {
  function TaskQueue() {
    (0, _classCallCheck2["default"])(this, TaskQueue);
    (0, _defineProperty2["default"])(this, "queue", []);
    (0, _defineProperty2["default"])(this, "numActiveWorkers", 0);
  }

  (0, _createClass2["default"])(TaskQueue, [{
    key: "enqueue",
    value: // add a task to the queue and start it immediately if not too busy
    function enqueue(promise) {
      var _this = this;

      // we will defer the resolve/reject until the item
      // is dequeued and its inner promise is resolved
      return new Promise(function (resolve, reject) {
        _this.queue.push({
          promise: promise,
          resolve: resolve,
          reject: reject
        });

        _this.dequeue();
      });
    }
  }, {
    key: "getLength",
    value: function getLength() {
      return this.queue.length;
    }
  }, {
    key: "getNumActive",
    value: function getNumActive() {
      return this.numActiveWorkers;
    }
  }, {
    key: "stopAll",
    value: function stopAll() {
      // note that items in flight will still complete
      while (this.queue.length > 0) {
        var item = this.queue.pop();

        if (item) {
          item.reject(REASON_CANCELLED);
        }
      }
    }
  }, {
    key: "dequeue",
    value: function dequeue() {
      var _this2 = this;

      if (this.numActiveWorkers >= MAX_ACTIVE_WORKERS) {
        // too many workers; keeping in queue
        return false;
      }

      var item = this.queue.shift();

      if (!item) {
        return false;
      }

      try {
        // we will process from the queue.
        // increment the number of concurrent tasks happening.
        this.numActiveWorkers++; // run the task

        item.promise().then(function (value) {
          _this2.numActiveWorkers--;
          item.resolve(value); // as soon as I finish, check the queue for another task

          _this2.dequeue();
        })["catch"](function (err) {
          _this2.numActiveWorkers--;
          item.reject(err); // as soon as I fail, check the queue for another task

          _this2.dequeue();
        });
      } catch (err) {
        this.numActiveWorkers--;
        item.reject(err); // as soon as I fail, check the queue for another task

        this.dequeue();
      }

      return true;
    }
  }]);
  return TaskQueue;
}(); // by default, export a "singleton" of this class.


exports.TaskQueue = TaskQueue;
var taskQueue = new TaskQueue();
var _default = taskQueue;
exports["default"] = _default;