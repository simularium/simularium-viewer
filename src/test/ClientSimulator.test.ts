import { vi } from "vitest";

import { ClientSimulator } from "../simularium/ClientSimulator.js";
import { CountingSim } from "./CountingSim.js";

const TOTAL_STEPS = 5;

describe("ClientSimulator", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test("stream stops after the frame at totalSteps - 1", () => {
        const sim = new ClientSimulator(new CountingSim(TOTAL_STEPS));
        const frameNumbers: number[] = [];
        sim.setTrajectoryDataHandler((msg) =>
            frameNumbers.push(msg.bundleData[0].frameNumber)
        );

        sim.stream();
        vi.advanceTimersByTime(66 * (TOTAL_STEPS + 10));

        expect(frameNumbers).toEqual([0, 1, 2, 3, 4]);
    });

    test("stream resumes from the middle and stops at totalSteps - 1", () => {
        const sim = new ClientSimulator(new CountingSim(TOTAL_STEPS));
        const frameNumbers: number[] = [];
        sim.setTrajectoryDataHandler((msg) =>
            frameNumbers.push(msg.bundleData[0].frameNumber)
        );

        sim.requestFrameByTime(2);
        sim.stream();
        vi.advanceTimersByTime(66 * (TOTAL_STEPS + 10));

        expect(frameNumbers).toEqual([2, 3, 4]);
    });
});
