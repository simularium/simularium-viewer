"use strict";

var _FrontEndError = require("../simularium/FrontEndError");

describe("FrontEndError", function () {
  test("it creates an error object with a message", function () {
    var error = new _FrontEndError.FrontEndError("message");
    expect(error.message).toEqual("message");
  });
  test("By default, it sets the error level to ERROR", function () {
    var error = new _FrontEndError.FrontEndError("message");
    expect(error.level).toEqual(_FrontEndError.ErrorLevel.ERROR);
  });
  test("It can have optional htmlData", function () {
    var error = new _FrontEndError.FrontEndError("", _FrontEndError.ErrorLevel.ERROR, "htmlData");
    expect(error.htmlData).toEqual("htmlData");
  });
  test("It takes in an optional level", function () {
    var error = new _FrontEndError.FrontEndError("message", _FrontEndError.ErrorLevel.WARNING);
    expect(error.level).toEqual(_FrontEndError.ErrorLevel.WARNING);
  });
});