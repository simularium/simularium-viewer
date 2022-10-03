import { convertColorStringToNumber, convertColorNumberToString } from "../visGeometry/color-utils";
describe("VisGeometry color-utils", function () {
  describe("convertColorStringToNumber", function () {
    test("returns a color number as is", function () {
      expect(convertColorStringToNumber(16777215)).toEqual(16777215);
    });
    test("converts a hex color string to a base-16 number", function () {
      expect(convertColorStringToNumber("#ffffff")).toEqual(16777215);
    });
  });
  describe("convertColorNumberToString", function () {
    test("returns a color string as is", function () {
      expect(convertColorNumberToString("#ffffff")).toEqual("#ffffff");
    });
    test("converts a base-16 color number to a hex color string", function () {
      expect(convertColorNumberToString(16777215)).toEqual("#ffffff");
    });
  });
});