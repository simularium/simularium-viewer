import { SimulariumController } from "../controller/index.js";
import { vi } from "vitest";

import { DummyRemoteSimulator } from "./DummyRemoteSimulator.js";
import { CountingSim } from "./CountingSim.js";

describe("SimulariumController module", () => {
    describe("SimulariumController Time", () => {
        test("Go to time in cache", () =>
            new Promise<void>((done) => {
                const netConn = new DummyRemoteSimulator({});
                netConn.timeStep = 1;
                netConn.totalDuration = 100;
                netConn.commandLatencyMS = 0;
                netConn.connectLatencyMS = 0;

                const controller = new SimulariumController({
                    remoteSimulator: netConn,
                });

                controller.start();
                controller.gotoTime(2);
                setTimeout(() => {
                    expect(controller.time()).toEqual(2);
                    done();
                }, 500);
            }));
    });

    describe("SimulariumController with a client simulator", () => {
        const TOTAL_STEPS = 5;
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        test("scrubbing back to time 0 after streaming uses the cache", async () => {
            const controller = new SimulariumController({});
            await controller.initNewFile({
                clientSimulator: new CountingSim(TOTAL_STEPS),
            });
            controller.resume();
            await vi.advanceTimersByTimeAsync(66 * (TOTAL_STEPS + 10));

            const cache = controller.visData.frameCache;
            expect(cache.numFrames).toEqual(TOTAL_STEPS);
            expect(controller.visData.hasLocalCacheForTime(0)).toBe(true);

            controller.gotoTime(0);
            await vi.advanceTimersByTimeAsync(66 * (TOTAL_STEPS + 10));
            expect(cache.numFrames).toEqual(TOTAL_STEPS);
        });
    });
});
