import { compareTimes } from "../util";

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
});
