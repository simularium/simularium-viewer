import { vi } from "vitest";

import VolumeModel from "../visGeometry/VolumeModel.js";
import { AgentData } from "../simularium/types.js";

type Deferred = { time: number; resolve: () => void };

// Stands in for a vole-core `Volume`: each `updateRequiredData` call stays
// pending until the test resolves it.
class FakeVolume {
    imageInfo = { numChannels: 3 };
    loadSpec = { time: 0 };
    pending: Deferred[] = [];
    requestedTimes: number[] = [];

    updateRequiredData(required: { time: number }): Promise<void> {
        this.requestedTimes.push(required.time);
        this.loadSpec = { time: required.time };
        return new Promise<void>((resolve) => {
            this.pending.push({ time: required.time, resolve });
        });
    }

    async finishNextLoad(): Promise<void> {
        const next = this.pending.shift();
        next?.resolve();
        // let the model's async load loop run
        await new Promise((r) => setTimeout(r, 0));
    }
}

const makeDrawable = () => ({
    setChannelOptions: vi.fn(),
    setBoundingBoxColor: vi.fn(),
    setShowBoundingBox: vi.fn(),
    setTranslation: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
});

const agentAtTime = (time: number): AgentData =>
    ({
        x: 0,
        y: 0,
        z: 0,
        xrot: 0,
        yrot: 0,
        zrot: 0,
        cr: 1,
        subpoints: [time, 0, 1, 2],
    } as unknown as AgentData);

const makeModel = () => {
    const model = new VolumeModel();
    const volume = new FakeVolume();
    const drawable = makeDrawable();
    // bypass setImage, which needs a real (WebGL) VolumeDrawable
    Object.assign(model, { volume, drawable });
    return { model, volume, drawable };
};

const isHidden = (model: VolumeModel) =>
    (model as unknown as { hidden: boolean }).hidden;

describe("VolumeModel", () => {
    test("only one load is in flight, and the latest requested time loads next", async () => {
        const { model, volume } = makeModel();

        model.setAgentData(agentAtTime(1));
        model.setAgentData(agentAtTime(2));
        model.setAgentData(agentAtTime(3));
        expect(volume.requestedTimes).toEqual([1]);

        await volume.finishNextLoad();
        // time 2 was superseded before it could start
        expect(volume.requestedTimes).toEqual([1, 3]);

        await volume.finishNextLoad();
        expect(volume.requestedTimes).toEqual([1, 3]);
        expect(volume.pending).toHaveLength(0);
    });

    test("a request for the time already loading does not start another load", async () => {
        const { model, volume } = makeModel();

        model.setAgentData(agentAtTime(1));
        model.setAgentData(agentAtTime(1));
        await volume.finishNextLoad();

        expect(volume.requestedTimes).toEqual([1]);
    });

    test("syncLoading resolves only once the requested time is loaded", async () => {
        const { model, volume } = makeModel();

        model.setAgentData(agentAtTime(1));
        let resolved = false;
        model.setAgentData(agentAtTime(2), true).then(() => {
            resolved = true;
        });

        await volume.finishNextLoad(); // finishes time 1, starts time 2
        expect(resolved).toBe(false);
        expect(volume.requestedTimes).toEqual([1, 2]);

        await volume.finishNextLoad(); // finishes time 2
        expect(resolved).toBe(true);
    });

    test("hideWhileLoading stays hidden until the latest requested time is loaded", async () => {
        const { model, volume } = makeModel();

        model.setAgentData(agentAtTime(1), false, true);
        expect(isHidden(model)).toBe(true);
        model.setAgentData(agentAtTime(2), false, true);

        await volume.finishNextLoad(); // time 1 loaded, but 2 is current
        expect(isHidden(model)).toBe(true);

        await volume.finishNextLoad(); // time 2 loaded
        expect(isHidden(model)).toBe(false);
    });

    test("a failed load does not leave waiters hanging", async () => {
        const { model, volume } = makeModel();
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        volume.updateRequiredData = vi.fn(() =>
            Promise.reject(new Error("network"))
        );

        await expect(
            model.setAgentData(agentAtTime(1), true)
        ).resolves.toBeUndefined();
    });
});
