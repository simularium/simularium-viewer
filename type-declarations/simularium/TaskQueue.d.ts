export declare const REASON_CANCELLED = "Cancelled";
export declare class TaskQueue {
    private queue;
    private numActiveWorkers;
    enqueue<T>(promise: () => Promise<T>): Promise<T>;
    getLength(): number;
    getNumActive(): number;
    stopAll(): void;
    private dequeue;
}
declare const taskQueue: TaskQueue;
export default taskQueue;
