import { TaskQueue, REASON_CANCELLED } from "../simularium/worker/TaskQueue";

const delay = (t) => {
    const resultPromise = new Promise((resolve) => {
        setTimeout(() => resolve(t), t);
    });
    return resultPromise;
};

describe("TaskQueue module", () => {
    // note that tests all add more than 4 tasks to exceed the max concurrency of the queue
    test("it resolves tasks that finish synchronously", () => {
        const add = (x, y) => {
            const resultPromise = new Promise((resolve) => {
                resolve(x + y);
            });
            return resultPromise;
        };
        const q = new TaskQueue();
        const p0 = q.enqueue(() => add(1, 2));
        const p1 = q.enqueue(() => add(2, 4));
        const p2 = q.enqueue(() => add(4, 5));
        const p3 = q.enqueue(() => add(4, 6));
        const p4 = q.enqueue(() => add(4, 7));
        const p5 = q.enqueue(() => add(4, 8));
        const expected = [3, 6, 9, 10, 11, 12];
        Promise.all([p0, p1, p2, p3, p4, p5]).then((retData) => {
            expect(retData).toEqual(expected);
        });
    });
    test("it resolves all delayed tasks", async () => {
        const addDelayed = (x, y, t) => {
            const resultPromise = new Promise((resolve) => {
                setTimeout(() => resolve(x + y), t);
            });
            return resultPromise;
        };
        const q = new TaskQueue();
        const p0 = await q.enqueue(() => addDelayed(1, 2, 500));
        const p1 = await q.enqueue(() => addDelayed(2, 4, 500));
        const p2 = await q.enqueue(() => addDelayed(4, 5, 500));
        const p3 = await q.enqueue(() => addDelayed(4, 6, 500));
        const p4 = await q.enqueue(() => addDelayed(4, 7, 500));
        const p5 = await q.enqueue(() => addDelayed(4, 8, 500));
        const expected = [3, 6, 9, 10, 11, 12];
        expect([p0, p1, p2, p3, p4, p5]).toEqual(expected);
    });
    test("it handles the case when some tasks reject", async () => {
        const addButRejectOdd = (x, y) => {
            const resultPromise = new Promise((resolve, reject) => {
                if ((x + y) % 2) {
                    reject("Odd sums are rejected");
                }
                resolve(x + y);
            });
            return resultPromise;
        };
        const q = new TaskQueue();
        const p0 = q.enqueue(() => addButRejectOdd(1, 2));
        const p1 = q.enqueue(() => addButRejectOdd(2, 4));
        const p2 = q.enqueue(() => addButRejectOdd(4, 5));
        const p3 = q.enqueue(() => addButRejectOdd(4, 6));
        const p4 = q.enqueue(() => addButRejectOdd(4, 7));
        const p5 = q.enqueue(() => addButRejectOdd(4, 8));
        await expect(p0).rejects.toEqual("Odd sums are rejected");
        await expect(p1).resolves.toEqual(6);
        await expect(p2).rejects.toEqual("Odd sums are rejected");
        await expect(p3).resolves.toEqual(10);
        await expect(p4).rejects.toEqual("Odd sums are rejected");
        await expect(p5).resolves.toEqual(12);
    });
    test("it handles the case when some delayed tasks reject", async () => {
        const addButRejectOddDelayed = (x, y, t) => {
            const resultPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    if ((x + y) % 2) {
                        reject("Odd sums are rejected");
                    }
                    resolve(x + y);
                }, t);
            });
            return resultPromise;
        };
        const q = new TaskQueue();
        const p0 = q.enqueue(() => addButRejectOddDelayed(1, 2, 500));
        const p1 = q.enqueue(() => addButRejectOddDelayed(2, 4, 500));
        const p2 = q.enqueue(() => addButRejectOddDelayed(4, 5, 500));
        const p3 = q.enqueue(() => addButRejectOddDelayed(4, 6, 500));
        const p4 = q.enqueue(() => addButRejectOddDelayed(4, 7, 500));
        const p5 = q.enqueue(() => addButRejectOddDelayed(4, 8, 500));
        await expect(p0).rejects.toEqual("Odd sums are rejected");
        await expect(p1).resolves.toEqual(6);
        await expect(p2).rejects.toEqual("Odd sums are rejected");
        await expect(p3).resolves.toEqual(10);
        await expect(p4).rejects.toEqual("Odd sums are rejected");
        await expect(p5).resolves.toEqual(12);
    });
    test("it handles the case when some tasks throw", async () => {
        const addButThrowOdd = (x, y) => {
            const resultPromise = new Promise((resolve) => {
                if ((x + y) % 2) {
                    throw "Odd sums are thrown";
                }
                resolve(x + y);
            });
            return resultPromise;
        };
        const q = new TaskQueue();
        const p0 = q.enqueue(() => addButThrowOdd(1, 2));
        const p1 = q.enqueue(() => addButThrowOdd(2, 4));
        const p2 = q.enqueue(() => addButThrowOdd(4, 5));
        const p3 = q.enqueue(() => addButThrowOdd(4, 6));
        const p4 = q.enqueue(() => addButThrowOdd(4, 7));
        const p5 = q.enqueue(() => addButThrowOdd(4, 8));
        await expect(p0).rejects.toEqual("Odd sums are thrown");
        await expect(p1).resolves.toEqual(6);
        await expect(p2).rejects.toEqual("Odd sums are thrown");
        await expect(p3).resolves.toEqual(10);
        await expect(p4).rejects.toEqual("Odd sums are thrown");
        await expect(p5).resolves.toEqual(12);
    });
    test("it can run tasks that resolve over time", async () => {
        const q = new TaskQueue();
        const p0 = q.enqueue(() => delay(1000));
        const p1 = q.enqueue(() => delay(1001));
        const p2 = q.enqueue(() => delay(1002));
        const p3 = q.enqueue(() => delay(1003));
        const p4 = q.enqueue(() => delay(1004));
        const p5 = q.enqueue(() => delay(1005));

        expect(q.getNumActive()).toBe(4);
        expect(q.getLength()).toBe(2);

        await expect(p0).resolves.toBe(1000);
        await expect(p1).resolves.toBe(1001);
        await expect(p2).resolves.toBe(1002);
        await expect(p3).resolves.toBe(1003);
        await expect(p4).resolves.toBe(1004);
        await expect(p5).resolves.toBe(1005);
    });
    test("it can cancel tasks not already started", async () => {
        const q = new TaskQueue();
        const p0 = q.enqueue(() => delay(1000));
        const p1 = q.enqueue(() => delay(1001));
        const p2 = q.enqueue(() => delay(1002));
        const p3 = q.enqueue(() => delay(1003));
        const p4 = q.enqueue(() => delay(1004));
        const p5 = q.enqueue(() => delay(1005));

        expect(q.getNumActive()).toBe(4);
        expect(q.getLength()).toBe(2);
        q.stopAll();
        expect(q.getLength()).toBe(0);

        p0.then((value) => {
            expect(value).toBe(1000);
        });
        p1.then((value) => {
            expect(value).toBe(1001);
        });
        p2.then((value) => {
            expect(value).toBe(1002);
        });
        p3.then((value) => {
            expect(value).toBe(1003);
        });
        p4.then(null, (error) => {
            expect(error).toBe(REASON_CANCELLED);
        });
        p5.then(null, (error) => {
            expect(error).toBe(REASON_CANCELLED);
        });
    });
    test("it can queue new tasks after cancelling", async () => {
        // enqueue 6 items
        // cancel queue
        // then enqueue another.
        // We expect the first 4 times to complete, the next two rejected, and the last to complete.

        const q = new TaskQueue();
        const p0 = q.enqueue(() => delay(1000));
        const p1 = q.enqueue(() => delay(1001));
        const p2 = q.enqueue(() => delay(1002));
        const p3 = q.enqueue(() => delay(1003));
        const p4 = q.enqueue(() => delay(1004));
        const p5 = q.enqueue(() => delay(1005));

        q.stopAll();
        expect(q.getLength()).toBe(0);
        expect(q.getNumActive()).toBe(4);

        const p6 = q.enqueue(() => delay(1006));
        expect(q.getLength()).toBe(1);

        p0.then((value) => {
            expect(value).toBe(1000);
        });
        p1.then((value) => {
            expect(value).toBe(1001);
        });
        p2.then((value) => {
            expect(value).toBe(1002);
        });
        p3.then((value) => {
            expect(value).toBe(1003);
        });
        p4.then(null, (error) => {
            expect(error).toBe(REASON_CANCELLED);
        });
        p5.then(null, (error) => {
            expect(error).toBe(REASON_CANCELLED);
        });
        p6.then((value) => {
            expect(value).toBe(1006);
        });
    });
});
