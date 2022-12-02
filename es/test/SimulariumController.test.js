import { SimulariumController } from "../controller";
import { DummyRemoteSimulator } from "./DummyRemoteSimulator";
describe("SimulariumController module", function () {
  describe("SimulariumController Time", function () {
    test("Go to time in cache", function (done) {
      var netConn = new DummyRemoteSimulator({});
      netConn.timeStep = 1;
      netConn.totalDuration = 100;
      netConn.commandLatencyMS = 0;
      netConn.connectLatencyMS = 0;
      var controller = new SimulariumController({
        remoteSimulator: netConn
      });
      controller.start(); // allow time for data streaming to occur

      setTimeout(function () {
        controller.gotoTime(2);
        expect(controller.time()).toEqual(2);
        done();
      }, 500);
    });
  });
});