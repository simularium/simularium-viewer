const ThreadUtil = {
    browserSupportsWebWorkers() {
        return typeof (Worker) !== 'undefined';
    },

    createWebWorkerFromFunction(fn) {
        return new Worker(URL.createObjectURL(new Blob([`(${fn})()`])));
    },
};

export { ThreadUtil };
export default ThreadUtil;
