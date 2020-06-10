declare const ThreadUtil: {
    browserSupportsWebWorkers(): boolean;
    createWebWorkerFromFunction(fn: any): Worker;
};
export { ThreadUtil };
export default ThreadUtil;
