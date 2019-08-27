import { VisData } from "../agentsim";

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
                frame_number: 0,
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
                frame_number: 0,
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
                frame_number: 0,
                time: 0,
            };
            expect(() => {
                VisData.parse(visDataMsgTooShort).toThrowError();
                VisData.parse(visDataMsgTooLong).toThrowError();
            });
        });
    });
});
