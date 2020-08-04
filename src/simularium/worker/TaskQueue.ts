interface QueueItem {
    // this is the actual task and the unknown is the return type
    promise: () => Promise<unknown>;
    // value is of promise's type
    resolve: (value?: unknown | PromiseLike<unknown>) => void;
    // reason is really any
    reject: (reason?: unknown) => void;
}

const MAX_ACTIVE_WORKERS = 4;

export default class TaskQueue {
    static queue: QueueItem[] = [];
    static pendingPromise = false;
    static numActiveWorkers = 0;

    static enqueue(promise: () => Promise<unknown>): Promise<unknown> {
        return new Promise((resolve, reject) => {
            this.queue.push({
                promise,
                resolve,
                reject,
            });
            this.dequeue();
        });
    }

    static dequeue(): boolean {
        if (this.numActiveWorkers >= MAX_ACTIVE_WORKERS) {
            // too many workers; keeping in queue
            return false;
        }
        const item = this.queue.shift();
        if (!item) {
            return false;
        }
        try {
            // we will process from the queue.
            // increment the number of concurrent tasks happening.
            this.numActiveWorkers++;
            item.promise()
                .then(value => {
                    this.numActiveWorkers--;
                    item.resolve(value);
                    // as soon as I finish, check the queue for another task
                    this.dequeue();
                })
                .catch(err => {
                    this.numActiveWorkers--;
                    item.reject(err);
                    // as soon as I fail, check the queue for another task
                    this.dequeue();
                });
        } catch (err) {
            this.numActiveWorkers--;
            item.reject(err);
            // as soon as I fail, check the queue for another task
            this.dequeue();
        }
        return true;
    }
}
