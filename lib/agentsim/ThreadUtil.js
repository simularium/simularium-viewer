"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ThreadUtil = void 0;
var ThreadUtil = {
  browserSupportsWebWorkers: function browserSupportsWebWorkers() {
    return typeof Worker !== "undefined";
  },
  createWebWorkerFromFunction: function createWebWorkerFromFunction(fn) {
    return new Worker(URL.createObjectURL(new Blob(["(".concat(fn, ")()")])));
  }
};
exports.ThreadUtil = ThreadUtil;
var _default = ThreadUtil;
exports.default = _default;