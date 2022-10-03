var ThreadUtil = {
  browserSupportsWebWorkers: function browserSupportsWebWorkers() {
    return typeof Worker !== "undefined";
  },
  createWebWorkerFromFunction: function createWebWorkerFromFunction(fn) {
    return new Worker(URL.createObjectURL(new Blob(["(".concat(fn, ")()")])));
  }
};
export { ThreadUtil };
export default ThreadUtil;