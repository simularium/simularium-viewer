"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.ThreadUtil = void 0;
var threadUtil = {
  browserSupportsWebWorkers: function browserSupportsWebWorkers() {
    return typeof Worker !== "undefined";
  },
  createWebWorkerFromFunction: function createWebWorkerFromFunction(fn) {
    return new Worker(URL.createObjectURL(new Blob(["(".concat(fn, ")()")])));
  }
};
exports.ThreadUtil = threadUtil;
var _default = threadUtil;
exports["default"] = _default;