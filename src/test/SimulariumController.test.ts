import { SimulariumController } from "../controller";
import { DummyRemoteSimulator } from "./DummyRemoteSimulator";

describe("SimulariumController module", () => {
    describe("SimulariumController Time", () => {
        test("Go to time in cache", (done) => {
            const netConn = new DummyRemoteSimulator({});
            netConn.timeStep = 1;
            netConn.totalDuration = 100;
            netConn.commandLatencyMS = 0;
            netConn.connectLatencyMS = 0;

            const controller = new SimulariumController({
                remoteSimulator: netConn,
            });

            controller.start();
            controller.gotoTime(2);
            setTimeout(() => {
                expect(controller.time()).toEqual(2);
                done();
            }, 500);
        });
    });
});
