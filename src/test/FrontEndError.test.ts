import FrontEndError, { ErrorLevel } from "../simularium/FrontEndError";

describe("FrontEndError", () => {
    test("it creates an error object with a message", () => {
        const error = new FrontEndError("message");
        expect(error.message).toEqual("message");
    });
    test("By default, it sets the error level to ERROR", () => {
        const error = new FrontEndError("message");
        expect(error.level).toEqual(ErrorLevel.ERROR);
    });
    test("It can have optional htmlData", () => {
        const error = new FrontEndError("", "htmlData");
        expect(error.htmlData).toEqual("htmlData");
    });
    test("It takes in an optional level", () => {
        const error = new FrontEndError("message", "", ErrorLevel.WARNING);
        expect(error.level).toEqual(ErrorLevel.WARNING);
    });
});
