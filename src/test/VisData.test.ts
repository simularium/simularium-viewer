import {
    VisData,
    VisDataMessage,
    NetMessageEnum,
    FrontEndError,
} from "../simularium/index.js";
import {
    calculateBufferSize,
    parseVisDataMessage,
} from "../simularium/VisDataParse.js";
import { AGENT_OBJECT_KEYS, CachedFrame } from "../simularium/types.js";
import { nullCachedFrame } from "../util.js";

// Sample data of a single agent of type '7'
//  moving linearly from (0,0,0) to (5,5,5)
//  and rotating 0-90 degrees around the x axis
//  over 5 frames from time 0-20

const testData = [
    {
        fileName: "",
        msgType: 1,
        bundleSize: 1,
        bundleStart: 0,
        bundleData: [
            {
                frameNumber: 0,
                time: 0,
                data: [1000, 0, 7, 0, 0, 0, 0, 0, 0, 1, 0], // Start at origin, 0 degrees
            },
        ],
    },
    {
        fileName: "",
        msgType: 1,
        bundleSize: 1,
        bundleStart: 1,
        bundleData: [
            {
                frameNumber: 1,
                time: 5,
                data: [1000, 0, 7, 1.25, 1.25, 1.25, 0, 22.5, 0, 1, 0], // 1/4 of the way
            },
        ],
    },
    {
        fileName: "",
        msgType: 1,
        bundleSize: 1,
        bundleStart: 2,
        bundleData: [
            {
                frameNumber: 2,
                time: 10,
                data: [1000, 0, 7, 2.5, 2.5, 2.5, 0, 45, 0, 1, 0], // Halfway
            },
        ],
    },
    {
        fileName: "",
        msgType: 1,
        bundleSize: 1,
        bundleStart: 3,
        bundleData: [
            {
                frameNumber: 3,
                time: 15,
                data: [1000, 0, 7, 3.75, 3.75, 3.75, 0, 67.5, 0, 1, 0], // 3/4 of the way
            },
        ],
    },
    {
        fileName: "",
        msgType: 1,
        bundleSize: 1,
        bundleStart: 4,
        bundleData: [
            {
                frameNumber: 4,
                time: 20,
                data: [1000, 0, 7, 5, 5, 5, 0, 90, 0, 1, 0], // Final position and rotation
            },
        ],
    },
];
//     fileName: "",
//     msgType: 1,
//     bundleSize: 5,
//     bundleStart: 0,
//     bundleData: [
//         {
//             frameNumber: 0,
//             time: 0,
//             data: [1000, 0, 7, 1, 1, 1, 0, 0, 0, 1, 0],
//         },
//         {
//             frameNumber: 1,
//             time: 5,
//             data: [1000, 0, 7, 2, 2, 2, 0, 22.5, 0, 1, 0],
//         },
//         {
//             frameNumber: 2,
//             time: 10,
//             data: [1000, 0, 7, 3, 3, 3, 0, 45, 0, 1, 0],
//         },
//         {
//             frameNumber: 3,
//             time: 15,
//             data: [1000, 0, 7, 4, 4, 4, 0, 67.5, 0, 1, 0],
//         },
//         {
//             frameNumber: 4,
//             time: 20,
//             data: [1000, 0, 7, 5, 5, 5, 0, 90, 0, 1, 0],
//         },
//     ],
// };

describe("VisData module", () => {
    describe("VisData parse", () => {
        test("it calculates the buffer size correctly for data with no subpoints", () => {
            const testData = [
                10, //"visType",
                15, //"instanceId",
                20, //"type",
                30, //"x",
                31, //"y",
                32, //"z",
                40, //"xrot",
                41, //"yrot",
                42, //"zrot",
                50, //"cr",
                0, //"nSubPoints",
            ];
            const HEADER_SIZE = 3; // frameNumber, time, agentCount
            const FRAME_DATA_SIZE = AGENT_OBJECT_KEYS.length;
            const expectedSize = (HEADER_SIZE + FRAME_DATA_SIZE) * 4;
            const result = calculateBufferSize(testData);
            expect(result).toEqual(expectedSize);
        });
        test("it calculates the buffer size correctly for data with subpoints", () => {
            const testData = [
                10, //"visType",
                15, //"instanceId",
                20, //"type",
                30, //"x",
                31, //"y",
                32, //"z",
                40, //"xrot",
                41, //"yrot",
                42, //"zrot",
                50, //"cr",
                2, //"nSubPoints",
                60, //"subpoint-1",
                61, //"subpoint-2",
            ];
            const HEADER_SIZE = 3; // frameNumber, time, agentCount
            const FRAME_DATA_SIZE = AGENT_OBJECT_KEYS.length;
            const nSubpoints = testData[10];
            const expectedSize =
                (HEADER_SIZE + FRAME_DATA_SIZE + nSubpoints) * 4;
            const result = calculateBufferSize(testData);
            expect(result).toEqual(expectedSize);
        });
        test("it returns a CachedFrame of header data and an array buffer", () => {
            const testData = [
                10, //"visType",
                15, //"instanceId",
                20, //"type",
                30, //"x",
                31, //"y",
                32, //"z",
                40, //"xrot",
                41, //"yrot",
                42, //"zrot",
                50, //"cr",
                3,
                60, //"subpoint-1",
                61, //"subpoint-2",
                62, //"subpoint-3",
            ];
            const expectedFrame: CachedFrame = {
                data: expect.any(ArrayBuffer),
                frameNumber: 0,
                time: 0,
                agentCount: 1,
                size: calculateBufferSize(testData),
            };
            const visDataMsg: VisDataMessage = {
                msgType: NetMessageEnum.ID_VIS_DATA_ARRIVE,
                bundleData: [
                    {
                        data: testData,
                        frameNumber: 0,
                        time: 0,
                    },
                ],
                bundleSize: 1,
                bundleStart: 0,
                fileName: "",
            };
            const result = parseVisDataMessage(visDataMsg);
            expect(result).toMatchObject(expectedFrame);
        });
        test("should throw error when there are too few subpoints", () => {
            const tooLong = [
                10, //"visType",
                15, //"instanceId",
                20, //"type",
                30, //"x",
                31, //"y",
                32, //"z",
                40, //"xrot",
                41, //"yrot",
                42, //"zrot",
                50, //"cr",
                4,
                60, //"subpoint-1",
                61, //"subpoint-2",
                62, //"subpoint-3",
            ];
            const visDataMsg: VisDataMessage = {
                msgType: NetMessageEnum.ID_VIS_DATA_ARRIVE,
                bundleData: [
                    {
                        data: tooLong,
                        frameNumber: 0,
                        time: 0,
                    },
                ],
                bundleSize: 1,
                bundleStart: 0,
                fileName: "",
            };
            expect(() => parseVisDataMessage(visDataMsg)).toThrow(
                FrontEndError
            );
        });
        test("currentFrame returns null frame when cache is empty", () => {
            const visData = new VisData();
            const emptyFrame = visData.currentFrameData;
            expect(emptyFrame).toEqual(nullCachedFrame());
        });
        test("can request frame from a cache size of 1", () => {
            const singleFrame: VisDataMessage = {
                msgType: 1,
                bundleSize: 1,
                bundleStart: 0,
                bundleData: [
                    {
                        frameNumber: 0,
                        time: 0,
                        data: [1000, 0, 7, 1, 1, 1, 0, 0, 0, 1, 0],
                    },
                ],
                fileName: "",
            };
            const expectedFrame: CachedFrame = {
                data: expect.any(ArrayBuffer),
                frameNumber: 0,
                time: 0,
                agentCount: 1,
                size: calculateBufferSize(singleFrame.bundleData[0].data),
            };
            const visData = new VisData();
            visData.parseAgentsFromNetData(singleFrame);

            const firstFrame = visData.currentFrameData;
            expect(firstFrame).toMatchObject(expectedFrame);
        });
        test("can find frames in cache by time", () => {
            const visData = new VisData();
            testData.forEach((frame) => {
                visData.parseAgentsFromNetData(frame);
            });
            const i = 0;
            while (!visData.atLatestFrame()) {
                expect(visData.hasLocalCacheForTime(i * 5)).toBe(true);
                visData.gotoNextFrame();
            }
        });
    });
    describe("Cache management", () => {
        let visData: VisData;

        beforeEach(() => {
            visData = new VisData();
            testData.forEach((frame) => {
                visData.parseAgentsFromNetData(frame);
            });
        });

        test("hasLocalCacheForFrame returns true for cached frames", () => {
            expect(visData.hasLocalCacheForFrame(0)).toBe(true);
            expect(visData.hasLocalCacheForFrame(4)).toBe(true);
        });
        test("gotoFrame changes current frame when frame exists in cache", () => {
            visData.goToFrame(2, false);
            expect(visData.currentFrameData.frameNumber).toBe(2);
        });
        test("gotoFrame does not change frame when frame doesn't exist", () => {
            const currentFrame = visData.currentFrameData.frameNumber;
            visData.goToFrame(10, false);
            expect(visData.currentFrameData.frameNumber).toBe(currentFrame);
        });
        test("hasLocalCacheForFrame returns false for non-cached frames", () => {
            expect(visData.hasLocalCacheForFrame(10)).toBe(false);
        });
        test("clearForNewTrajectory resets streaming state", () => {
            visData.clearForNewTrajectory();
            expect(visData.currentFrameData).toEqual(nullCachedFrame());
            expect(visData.currentStreamingHead).toBe(-1);
            expect(visData.remoteStreamingHeadPotentiallyOutOfSync).toBe(false);
        });
    });

    describe("Cache overflow handling", () => {
        let visData: VisData;
        const oneFrameMaxCacheSize = 100;

        beforeEach(() => {
            visData = new VisData();
            visData.frameCache.changeSettings({
                maxSize: oneFrameMaxCacheSize,
            });
        });

        test("setting max size updates cache limited flag", () => {
            expect(visData.frameCache.cacheSizeLimited).toBe(true);
        });
        test("handles overflow by trimming when cache head is behind playback", () => {
            const maxCacheTwoTestFrames = 150;
            visData.frameCache.changeSettings({
                maxSize: maxCacheTwoTestFrames,
            });
            visData.parseAgentsFromNetData(testData[0]);
            visData.parseAgentsFromNetData(testData[1]);
            visData.goToFrame(1, false);
            visData.parseAgentsFromNetData(testData[2]);

            expect(visData.hasLocalCacheForFrame(0)).toBe(false);
            expect(visData.hasLocalCacheForFrame(2)).toBe(true);
            expect(visData.frameCache.size).toBeLessThanOrEqual(
                maxCacheTwoTestFrames
            );
        });
        test("sets remoteStreamingHeadPotentiallyOutOfSync when paused and cache is full", () => {
            visData.parseAgentsFromNetData(testData[0]);
            visData.isPlaying = false;

            // Mock the onCacheLimitReached callback
            const mockCallback = vitest.fn();
            visData.onCacheLimitReached = mockCallback;
            visData.parseAgentsFromNetData(testData[4]);
            expect(visData.remoteStreamingHeadPotentiallyOutOfSync).toBe(true);
            expect(mockCallback).toHaveBeenCalled();
        });
    });
});
