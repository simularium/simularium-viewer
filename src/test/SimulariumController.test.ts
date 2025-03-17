import SimulariumController from "../controller";

describe("SimulariumController module", () => {
    describe("SimulariumController Time", () => {
        test("Go to time in cache", () => {
            // todo new approach to testing dummy simulator comming in
            // changes to simulator params
            const controller = new SimulariumController();
            expect(controller).toBeDefined();
        });
    });
});
