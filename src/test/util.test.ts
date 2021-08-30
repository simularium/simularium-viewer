import { checkAndSanitizePath, compareTimes } from "../util";

describe("util", () => {
    describe("compareTimes", () => {
        const PRECISION_REF = 0.1;

        test("it correctly determines time1 > time2", () => {
            const result = compareTimes(
                14.699999809265137,
                14.6,
                PRECISION_REF
            );
            expect(result).toEqual(1);
        });

        test("it correctly determines time1 < time2", () => {
            const result = compareTimes(
                14.600000381469727,
                14.699999809265137,
                PRECISION_REF
            );
            expect(result).toEqual(-1);
        });

        test("it correctly determines time1 ~= time2 when time1 is slightly greater", () => {
            const result = compareTimes(
                14.700000190734863,
                14.699999809265137,
                PRECISION_REF
            );
            expect(result).toEqual(0);
        });

        test("it correctly determines time1 ~= time2 when time1 is slightly less", () => {
            const result = compareTimes(
                14.699999809265137,
                14.7,
                PRECISION_REF
            );
            expect(result).toEqual(0);
        });

        test("it correctly determines time1 ~= time2 when numbers are equal", () => {
            const result = compareTimes(0.005, 0.005, 0.005);
            expect(result).toEqual(0);
        });
    });
    describe("checkAndSanitizePath", () => {
        test("it returns a url unmodified", () => {
            const url = "http://www.url.com";
            const result = checkAndSanitizePath(url);
            expect(result).toEqual(url);
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
});
