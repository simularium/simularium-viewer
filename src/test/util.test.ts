import { FrontEndError } from "../simularium";
import { checkAndSanitizePath, compareTimes, getAgentDataFromBuffer, getNextAgentOffset } from "../util";

describe("util", () => {
    describe("compareTimes", () => {
        const PRECISION_REF = 0.1;

        test("it correctly determines time1 > time2", () => {
            const result = compareTimes(14.699999809265137, 14.6, PRECISION_REF);
            expect(result).toEqual(1);
        });

        test("it correctly determines time1 < time2", () => {
            const result = compareTimes(14.600000381469727, 14.699999809265137, PRECISION_REF);
            expect(result).toEqual(-1);
        });

        test("it correctly determines time1 ~= time2 when time1 is slightly greater", () => {
            const result = compareTimes(14.700000190734863, 14.699999809265137, PRECISION_REF);
            expect(result).toEqual(0);
        });

        test("it correctly determines time1 ~= time2 when time1 is slightly less", () => {
            const result = compareTimes(14.699999809265137, 14.7, PRECISION_REF);
            expect(result).toEqual(0);
        });

        test("it correctly determines time1 ~= time2 when numbers are equal", () => {
            const result = compareTimes(0.005, 0.005, 0.005);
            expect(result).toEqual(0);
        });
    });
    describe("checkAndSanitizePath", () => {
        test("it returns a non dropbox url unmodified", () => {
            const url = "http://www.url.com";
            const result = checkAndSanitizePath(url);
            expect(result).toEqual(url);
        });
        test("it returns a dropbox url modified with dropboxusercontent", () => {
            const url = "https://www.dropbox.com/scl/fi/xh3vmyt9d74cl5cbhqgpm/Antigen.obj?rlkey=key&dl=1";
            const expected =
                "https://dl.dropboxusercontent.com/scl/fi/xh3vmyt9d74cl5cbhqgpm/Antigen.obj?rlkey=key&dl=1";
            expect(checkAndSanitizePath(url)).toEqual(expected);
        });
        test("it returns a path with a forward slash unmodified", () => {
            const path = "/path/to/file.obj";
            const result = checkAndSanitizePath(path);
            expect(result).toEqual(path);
        });
        test("it adds a forward slash to a path if it isn't there", () => {
            const path = "path/to/file.obj";
            const result = checkAndSanitizePath(path);
            expect(result).toEqual(`/${path}`);
        });
    });

    describe("getNextAgentOffest", () => {
        test("it returns the correct offset based on nSubPoints of the first agent", () => {
            const twoAgentTestData = [
                10, //"visType" (agent 1)
                15, //"instanceId" (agent 1)
                20, //"type" (agent 1)
                30, //"x" (agent 1)
                31, //"y" (agent 1)
                32, //"z" (agent 1)
                40, //"xrot" (agent 1)
                41, //"yrot" (agent 1)
                42, //"zrot" (agent 1)
                50, //"cr" (agent 1)
                3, // "nSubPoints" (agent 1)
                60, //"subpoint-1" (agent 1)
                61, //"subpoint-2" (agent 1)
                62, //"subpoint-3" (agent 1)

                11, //"visType" (agent 2)
                16, //"instanceId" (agent 2)
                21, //"type" (agent 2)
                33, //"x" (agent 2)
                34, //"y" (agent 2)
                35, //"z" (agent 2)
                43, //"xrot" (agent 2)
                44, //"yrot" (agent 2)
                45, //"zrot" (agent 2)
                51, //"cr" (agent 2)
                2, // "nSubPoints" (agent 2)
                63, //"subpoint-1" (agent 2)
                64, //"subpoint-2" (agent 2)
            ];
            const view = new Float32Array(twoAgentTestData);

            // Offset for the first agent is 0
            const firstAgentOffset = 0;
            const nextOffset = getNextAgentOffset(view, firstAgentOffset);

            // The first agent has 11 standard fields + 3 subpoints, so the next offset should be 13
            expect(nextOffset).toBe(14);
        });

        describe("getAgentDataFromBuffer", () => {
            test("it returns the correct AgentData object for a single cached agent", () => {
                const singleAgentTestData = [
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
                const view = new Float32Array(singleAgentTestData);
                const parsedData = getAgentDataFromBuffer(view, 0);
                expect(parsedData).toEqual({
                    visType: 10, //"visType",
                    instanceId: 15, //"instanceId",
                    type: 20, //"type",
                    x: 30, //"x",
                    y: 31, //"y",
                    z: 32, //"z",
                    xrot: 40, //"xrot",
                    yrot: 41, //"yrot",
                    zrot: 42, //"zrot",
                    cr: 50, //"cr",
                    nSubPoints: 3,
                    subpoints: [60, 61, 62], //"subpoint-1", "subpoint-2", "subpoint-3"],
                });
            });
            test("it returns the correct AgentData object for the second agent based on updated offset", () => {
                const twoAgentTestData = [
                    10, //"visType" (agent 1)
                    15, //"instanceId" (agent 1)
                    20, //"type" (agent 1)
                    30, //"x" (agent 1)
                    31, //"y" (agent 1)
                    32, //"z" (agent 1)
                    40, //"xrot" (agent 1)
                    41, //"yrot" (agent 1)
                    42, //"zrot" (agent 1)
                    50, //"cr" (agent 1)
                    3, // "nSubPoints" (agent 1)
                    60, //"subpoint-1" (agent 1)
                    61, //"subpoint-2" (agent 1)
                    62, //"subpoint-3" (agent 1)

                    11, //"visType" (agent 2)
                    16, //"instanceId" (agent 2)
                    21, //"type" (agent 2)
                    33, //"x" (agent 2)
                    34, //"y" (agent 2)
                    35, //"z" (agent 2)
                    43, //"xrot" (agent 2)
                    44, //"yrot" (agent 2)
                    45, //"zrot" (agent 2)
                    51, //"cr" (agent 2)
                    2, // "nSubPoints" (agent 2)
                    63, //"subpoint-1" (agent 2)
                    64, //"subpoint-2" (agent 2)
                ];
                const view = new Float32Array(twoAgentTestData);

                // Get the offset for the second agent
                const firstAgentOffset = 0;
                const secondAgentOffset = getNextAgentOffset(view, firstAgentOffset);

                // Parse the second agent data
                const secondAgentData = getAgentDataFromBuffer(view, secondAgentOffset);

                // Check that the second agent's data is parsed correctly
                expect(secondAgentData).toEqual({
                    visType: 11, //"visType"
                    instanceId: 16, //"instanceId"
                    type: 21, //"type"
                    x: 33, //"x"
                    y: 34, //"y"
                    z: 35, //"z"
                    xrot: 43, //"xrot"
                    yrot: 44, //"yrot"
                    zrot: 45, //"zrot"
                    cr: 51, //"cr"
                    nSubPoints: 2,
                    subpoints: [63, 64], //"subpoint-1", "subpoint-2"
                });
            });
            test("it throws an error if the data doesn't have the right shape", () => {
                // Test with not enough data for the agent object keys
                const invalidTestData = [
                    10,
                    15,
                    20,
                    30,
                    31,
                    32,
                    40,
                    41, // Missing other values like zrot, cr, nSubPoints, etc.
                ];
                const view = new Float32Array(invalidTestData);

                // Expect the function to throw an error when trying to parse this invalid data
                expect(() => getAgentDataFromBuffer(view, 0)).toThrow(FrontEndError);
            });

            test("it throws an error if the subpoints exceed available data", () => {
                const incompleteSubpointsTestData = [
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
                    3, //"nSubPoints"
                    60, //"subpoint-1",
                    61, // Missing "subpoint-3"
                ];
                const view = new Float32Array(incompleteSubpointsTestData);

                // Expect the function to throw an error because there aren't enough subpoints
                expect(() => getAgentDataFromBuffer(view, 0)).toThrow(FrontEndError);
            });
        });
    });
});
