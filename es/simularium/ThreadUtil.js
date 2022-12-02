var threadUtil = {
  browserSupportsWebWorkers: function browserSupportsWebWorkers() {
    return typeof Worker !== "undefined";
  },
  createWebWorkerFromFunction: function createWebWorkerFromFunction(fn) {
    return new Worker(URL.createObjectURL(new Blob(["(".concat(fn, ")()")])));
  }
};
export { threadUtil as ThreadUtil };
export default threadUtil;