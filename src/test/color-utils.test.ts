import {
    convertColorStringToNumber,
    convertColorNumberToString,
} from "../visGeometry/color-utils";

describe("VisGeometry color-utils", () => {
    describe("convertColorStringToNumber", () => {
        test("returns a color number as is", () => {
            expect(convertColorStringToNumber(16777215)).toEqual(16777215);
        });
        test("converts a hex color string to a base-16 number", () => {
            expect(convertColorStringToNumber("#ffffff")).toEqual(16777215);
        });
    });
    describe("convertColorNumberToString", () => {
        test("returns a color string as is", () => {
            expect(convertColorNumberToString("#ffffff")).toEqual("#ffffff");
        });
        test("converts a base-16 color number to a hex color string", () => {
            expect(convertColorNumberToString(16777215)).toEqual("#ffffff");
        });
    });
});
