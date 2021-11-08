import {
    convertColorStringToNumber,
    convertColorNumberToString,
} from "../simularium/VisGeometry/color-utils";

describe("VisGeometry color-utils", () => {
    describe("convertColorStringToNumber", () => {
        test("returns a color number as is", () => {
            expect(convertColorStringToNumber(16777215)).toEqual(16777215);
        });
        test("converts a color string to a base-16 number", () => {
            expect(convertColorStringToNumber("#ffffff")).toEqual(16777215);
        });
    });
    describe("convertColorNumberToString", () => {
        test("returns a color string as is", () => {
            expect(convertColorNumberToString("#ffffff")).toEqual("#ffffff");
        });
        test("converts a color string to a base-16 number", () => {
            expect(convertColorNumberToString(16777215)).toEqual("#ffffff");
        });
    });
});
