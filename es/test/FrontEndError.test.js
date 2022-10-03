import { FrontEndError, ErrorLevel } from "../simularium/FrontEndError";
describe("FrontEndError", function () {
  test("it creates an error object with a message", function () {
    var error = new FrontEndError("message");
    expect(error.message).toEqual("message");
  });
  test("By default, it sets the error level to ERROR", function () {
    var error = new FrontEndError("message");
    expect(error.level).toEqual(ErrorLevel.ERROR);
  });
  test("It can have optional htmlData", function () {
    var error = new FrontEndError("", ErrorLevel.ERROR, "htmlData");
    expect(error.htmlData).toEqual("htmlData");
  });
  test("It takes in an optional level", function () {
    var error = new FrontEndError("message", ErrorLevel.WARNING);
    expect(error.level).toEqual(ErrorLevel.WARNING);
  });
});