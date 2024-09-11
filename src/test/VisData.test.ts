import {
    VisData,
    VisDataMessage,
    NetMessageEnum,
    FrontEndError,
} from "../simularium";
import {
    calculateBufferSize,
    parseVisDataMessage,
} from "../simularium/VisDataParse";
import { AGENT_OBJECT_KEYS, CachedFrame } from "../simularium/types";
import { nullCachedFrame } from "../util";

// Sample data of a single agent of type '7'
//  moving linearly from (0,0,0) to (5,5,5)
//  and rotating 0-90 degrees around the x axis
//  over 5 frames from time 0-20
const testData = {
    fileName: "",
    msgType: 1,
    bundleSize: 5,
    bundleStart: 0,
    bundleData: [
        {
            frameNumber: 0,
            time: 0,
            data: [1000, 0, 7, 1, 1, 1, 0, 0, 0, 1, 0],
        },
        {
            frameNumber: 1,
            time: 5,
            data: [1000, 0, 7, 2, 2, 2, 0, 22.5, 0, 1, 0],
        },
        {
            frameNumber: 2,
            time: 10,
            data: [1000, 0, 7, 3, 3, 3, 0, 45, 0, 1, 0],
        },
        {
            frameNumber: 3,
            time: 15,
            data: [1000, 0, 7, 4, 4, 4, 0, 67.5, 0, 1, 0],
        },
        {
            frameNumber: 4,
            time: 20,
            data: [1000, 0, 7, 5, 5, 5, 0, 90, 0, 1, 0],
        },
    ],
};

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
            const emptyFrame = visData.currentFrame();
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

            const firstFrame = visData.currentFrame();
            expect(firstFrame).toMatchObject(expectedFrame);
        });
        test("can find frames in cache by time", () => {
            const visData = new VisData();
            visData.parseAgentsFromNetData(testData);

            const i = 0;
            while (!visData.atLatestFrame()) {
                expect(visData.hasLocalCacheForTime(i * 5)).toBe(true);
                visData.gotoNextFrame();
            }
        });
    });
});
