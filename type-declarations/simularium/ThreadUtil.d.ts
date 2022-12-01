declare const threadUtil: {
    browserSupportsWebWorkers(): boolean;
    createWebWorkerFromFunction(fn: string): Worker;
};
export { threadUtil as ThreadUtil };
export default threadUtil;
