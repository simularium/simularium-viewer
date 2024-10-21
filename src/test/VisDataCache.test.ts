import { CachedFrame } from "../simularium/types";
import { VisDataCache } from "../simularium/VisDataCache";

describe("VisDataCache", () => {
    const dummyDattaBuffer = new ArrayBuffer(100);
    const dummyFrameSize = dummyDattaBuffer.byteLength + 8 * 4;
    const testFrame0: CachedFrame = {
        data: dummyDattaBuffer,
        frameNumber: 0,
        time: 0,
        agentCount: 10,
        size: dummyFrameSize,
    };
    const testFrame1: CachedFrame = {
        data: dummyDattaBuffer,
        frameNumber: 1,
        time: 1,
        agentCount: 10,
        size: dummyFrameSize,
    };
    const testFrame2: CachedFrame = {
        data: dummyDattaBuffer,
        frameNumber: 2,
        time: 2,
        agentCount: 10,
        size: dummyFrameSize,
    };

    it("initializes a disabled cache when enabled option is false", () => {
        const cache = new VisDataCache({
            cacheEnabled: false,
        });
        expect(cache.cacheEnabled).toEqual(false);
    });
    it("updating settings can disable the cache", () => {
        const cache = new VisDataCache({
            cacheEnabled: true,
        });
        cache.changeSettings({ cacheEnabled: false });
        expect(cache.cacheEnabled).toEqual(false);
    });
    it("only adds firstFrame and clears the cache when cache is disabled", () => {
        const cache = new VisDataCache({ cacheEnabled: false });
        cache.addFrame(testFrame0);
        cache.addFrame(testFrame1);
        expect(cache.getFirstFrame()).toEqual(testFrame1);
        expect(cache.getLastFrame()).toEqual(testFrame1);
        expect(cache.numFrames).toEqual(1);
    });
    it("clears cache and adds first frame if addFrame is called and cache is empty", () => {
        const cache = new VisDataCache();
        cache.addFrame(testFrame0);
        expect(cache.getFirstFrame()).toEqual(testFrame0);
        expect(cache.getLastFrame()).toEqual(testFrame0);
        expect(cache.numFrames).toEqual(1);
    });

    it("adds frames to end of cache if cache is enabled and has frames in it", () => {
        const cache = new VisDataCache({ cacheEnabled: true });
        cache.addFrame(testFrame0);
        cache.addFrame(testFrame1);
        expect(cache.getFirstFrame()).toEqual(testFrame0);
        expect(cache.getLastFrame()).toEqual(testFrame1);
        expect(cache.numFrames).toEqual(2);
    });

    it("trims the cache before adding frames when incoming frame size pushes size over maxSize", () => {
        const cache = new VisDataCache({
            cacheEnabled: true,
            maxSize: dummyFrameSize * 2 + 1,
        });
        cache.addFrame(testFrame0);
        cache.addFrame(testFrame1);
        cache.addFrame(testFrame2);
        expect(cache.maxSize).toEqual(dummyFrameSize * 2 + 1);
        expect(cache.getFirstFrame()).toEqual(testFrame1);
        expect(cache.getLastFrame()).toEqual(testFrame2);
        expect(cache.numFrames).toEqual(2);
    });

    it("trims the cache when maxSize is updated after intialization", () => {
        const cache = new VisDataCache({
            cacheEnabled: true,
        });
        cache.changeSettings({ maxSize: dummyFrameSize * 2 + 1 });
        cache.addFrame(testFrame0);
        cache.addFrame(testFrame1);
        cache.addFrame(testFrame2);
        expect(cache.maxSize).toEqual(dummyFrameSize * 2 + 1);
        expect(cache.getFirstFrame()).toEqual(testFrame1);
        expect(cache.getLastFrame()).toEqual(testFrame2);
        expect(cache.numFrames).toEqual(2);
    });
    it("returns true if a frame with the provided time is in the cache", () => {
        const cache = new VisDataCache();
        cache.addFrame(testFrame0);
        cache.addFrame(testFrame1);
        expect(cache.containsTime(1)).toEqual(true);
    });
    it("returns false for containsTime if the provided time is not in the cache", () => {
        const cache = new VisDataCache();
        cache.addFrame(testFrame0);
        cache.addFrame(testFrame1);
        expect(cache.containsTime(3)).toEqual(false);
    });
    it("returns undefined when head is null", () => {
        const cache = new VisDataCache();
        expect(cache.getFirstFrame()).toEqual(undefined);
        expect(cache.getLastFrame()).toEqual(undefined);
    });
    it("returns -1 for first and last frame numbers and time if head or tail is null ", () => {
        const cache = new VisDataCache();
        expect(cache.getFirstFrameTime()).toEqual(-1);
        expect(cache.getLastFrameTime()).toEqual(-1);
        expect(cache.getFirstFrameNumber()).toEqual(-1);
        expect(cache.getLastFrameNumber()).toEqual(-1);
    });

    it("gets the correct frame when calling getFrameAtFrameNumber", () => {
        const cache = new VisDataCache();
        cache.addFrame(testFrame0);
        cache.addFrame(testFrame1);
        expect(cache.getFrameAtFrameNumber(1)).toEqual(testFrame1);
    });
    it("clears the cache when clear is called", () => {
        const cache = new VisDataCache();
        cache.addFrame(testFrame0);
        cache.clear();
        expect(cache.numFrames).toEqual(0);
    });
});
