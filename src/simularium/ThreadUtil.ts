const threadUtil = {
    browserSupportsWebWorkers(): boolean {
        return typeof Worker !== "undefined";
    },

    createWebWorkerFromFunction(fn: string): Worker {
        return new Worker(URL.createObjectURL(new Blob([`(${fn})()`])));
    },
};

export { threadUtil as ThreadUtil };
export default threadUtil;
