import { VisData } from "../agentsim";

// Sample data of a single agent of type '7'
//  moving linearly from (0,0,0) to (5,5,5)
//  and rotating 0-90 degrees around the x axis
//  over 5 frames from time 0-20
const testData = {
    bundleSize: 5,
    bundleStart: 0,
    bundleData: [
        {
            msgType: 1,
            frameNumber: 0,
            time: 0,
            data: [1000, 7, 1, 1, 1, 0, 0, 0, 1, 0],
        },
        {
            msgType: 1,
            frameNumber: 1,
            time: 5,
            data: [1000, 7, 2, 2, 2, 0, 22.5, 0, 1, 0],
        },
        {
            msgType: 1,
            frameNumber: 2,
            time: 10,
            data: [1000, 7, 3, 3, 3, 0, 45, 0, 1, 0],
        },
        {
            msgType: 1,
            frameNumber: 3,
            time: 15,
            data: [1000, 7, 4, 4, 4, 0, 67.5, 0, 1, 0],
        },
        {
            msgType: 1,
            frameNumber: 4,
            time: 20,
            data: [1000, 7, 5, 5, 5, 0, 90, 0, 1, 0],
        },
    ],
};

const parsedData = [
    [
        {
            cr: 1,
            nSubPoints: 0,
            subpoints: [],
            type: 7,
            "vis-type": 1000,
            x: 1,
            xrot: 0,
            y: 1,
            yrot: 0,
            z: 1,
            zrot: 0,
        },
    ],
    [
        {
            cr: 1,
            nSubPoints: 0,
            subpoints: [],
            type: 7,
            "vis-type": 1000,
            x: 2,
            xrot: 0,
            y: 2,
            yrot: 22.5,
            z: 2,
            zrot: 0,
        },
    ],
    [
        {
            cr: 1,
            nSubPoints: 0,
            subpoints: [],
            type: 7,
            "vis-type": 1000,
            x: 3,
            xrot: 0,
            y: 3,
            yrot: 45,
            z: 3,
            zrot: 0,
        },
    ],
    [
        {
            cr: 1,
            nSubPoints: 0,
            subpoints: [],
            type: 7,
            "vis-type": 1000,
            x: 4,
            xrot: 0,
            y: 4,
            yrot: 67.5,
            z: 4,
            zrot: 0,
        },
    ],
    [
        {
            cr: 1,
            nSubPoints: 0,
            subpoints: [],
            type: 7,
            "vis-type": 1000,
            x: 5,
            xrot: 0,
            y: 5,
            yrot: 90,
            z: 5,
            zrot: 0,
        },
    ],
];

describe("VisData module", () => {
    describe("VisData parse", () => {
        test("it returns an array of objects of agent data and time stamp data", () => {
            const testData = [
                "vis-type",
                "type",
                "x",
                "y",
                "z",
                "xrot",
                "yrot",
                "zrot",
                "cr",
                3,
                "subpoint-1",
                "subpoint-2",
                "subpoint-3",
            ];
            const visDataMsg = {
                data: testData,
                frameNumber: 0,
                time: 0,
            };
            const parsedData = VisData.parse(visDataMsg);
            expect(parsedData.frameData).toEqual({ frameNumber: 0, time: 0 });
            expect(parsedData.parsedAgentData).toEqual([
                {
                    cr: "cr",
                    nSubPoints: 3,
                    subpoints: ["subpoint-1", "subpoint-2", "subpoint-3"],
                    type: "type",
                    "vis-type": "vis-type",
                    x: "x",
                    xrot: "xrot",
                    y: "y",
                    yrot: "yrot",
                    z: "z",
                    zrot: "zrot",
                },
            ]);
        });
        test("it throws an error if number of supoints does not match the nSubpoints value", () => {
            const tooShort = [
                "vis-type",
                "type",
                "x",
                "y",
                "z",
                "xrot",
                "yrot",
                "zrot",
                "cr",
                10,
                "subpoint-1",
                "subpoint-2",
                "subpoint-3",
                "subpoint-4",
            ];
            const visDataMsgTooShort = {
                data: tooShort,
                frameNumber: 0,
                time: 0,
            };
            const tooLong = [
                "vis-type",
                "type",
                "x",
                "y",
                "z",
                "xrot",
                "yrot",
                "zrot",
                "cr",
                2,
                "subpoint-1",
                "subpoint-2",
                "subpoint-3",
            ];
            const visDataMsgTooLong = {
                data: tooLong,
                frameNumber: 0,
                time: 0,
            };
            expect(() => {
                VisData.parse(visDataMsgTooShort).toThrowError();
                VisData.parse(visDataMsgTooLong).toThrowError();
            });
        });
        test("currentFrame returns empty frame when cache is empty", () => {
            let visData = new VisData();
            let emptyFrame = visData.currentFrame();
            expect(emptyFrame).toEqual({});
        });
        test("can request frame from a cache size of 1", () => {
            const singleFrame = {
                bundleSize: 1,
                bundleStart: 0,
                bundleData: [
                    {
                        msgType: 1,
                        frameNumber: 1,
                        time: 0,
                        data: [1000, 7, 1, 1, 1, 0, 0, 0, 1, 0],
                    },
                ],
            };

            const parsedSingleFrame = [
                {
                    cr: 1,
                    nSubPoints: 0,
                    subpoints: [],
                    type: 7,
                    "vis-type": 1000,
                    x: 1,
                    xrot: 0,
                    y: 1,
                    yrot: 0,
                    z: 1,
                    zrot: 0,
                },
            ];

            let visData = new VisData();
            visData.parseAgentsFromNetData(singleFrame);

            let firstFrame = visData.currentFrame();
            expect(firstFrame).toEqual(parsedSingleFrame);
        });
        test("parses 5 frame bundle correctly", () => {
            let visData = new VisData();
            visData.parseAgentsFromNetData(testData);
            expect(visData.atLatestFrame()).toBe(false);

            let i = 0;
            while (!visData.atLatestFrame()) {
                let currentFrame = visData.currentFrame();
                expect(currentFrame).toEqual(parsedData[i++]);
                visData.gotoNextFrame();
            }
        });
    });
});
