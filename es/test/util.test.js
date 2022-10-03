import { checkAndSanitizePath, compareTimes } from "../util";
describe("util", function () {
  describe("compareTimes", function () {
    var PRECISION_REF = 0.1;
    test("it correctly determines time1 > time2", function () {
      var result = compareTimes(14.699999809265137, 14.6, PRECISION_REF);
      expect(result).toEqual(1);
    });
    test("it correctly determines time1 < time2", function () {
      var result = compareTimes(14.600000381469727, 14.699999809265137, PRECISION_REF);
      expect(result).toEqual(-1);
    });
    test("it correctly determines time1 ~= time2 when time1 is slightly greater", function () {
      var result = compareTimes(14.700000190734863, 14.699999809265137, PRECISION_REF);
      expect(result).toEqual(0);
    });
    test("it correctly determines time1 ~= time2 when time1 is slightly less", function () {
      var result = compareTimes(14.699999809265137, 14.7, PRECISION_REF);
      expect(result).toEqual(0);
    });
    test("it correctly determines time1 ~= time2 when numbers are equal", function () {
      var result = compareTimes(0.005, 0.005, 0.005);
      expect(result).toEqual(0);
    });
  });
  describe("checkAndSanitizePath", function () {
    test("it returns a url unmodified", function () {
      var url = "http://www.url.com";
      var result = checkAndSanitizePath(url);
      expect(result).toEqual(url);
    });
    test("it returns a path with a forward slash unmodified", function () {
      var path = "/path/to/file.obj";
      var result = checkAndSanitizePath(path);
      expect(result).toEqual(path);
    });
    test("it adds a forward slash to a path if it isn't there", function () {
      var path = "path/to/file.obj";
      var result = checkAndSanitizePath(path);
      expect(result).toEqual("/".concat(path));
    });
  });
});