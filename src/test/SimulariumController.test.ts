import { SimulariumController } from "../controller/index.js";
import { DummyRemoteSimulator } from "./DummyRemoteSimulator.js";

describe("SimulariumController module", () => {
    let netConn: DummyRemoteSimulator;
    let controller: SimulariumController;
    const DEFAULT_TIMEOUT = 500;

    beforeEach(() => {
        netConn = new DummyRemoteSimulator({});
        netConn.timeStep = 1;
        netConn.totalDuration = 100;
        netConn.commandLatencyMS = 0;
        netConn.connectLatencyMS = 0;

        controller = new SimulariumController({
            remoteSimulator: netConn,
        });
        // this does not test whether the simulator, controller and
        // visData are properly configured (no viewport is configured with
        // a trajFileInfo handler)
        // but is a more robust test than just calling for a given time
        // via simulator.requestFrameByTime, in terms of asking if
        // controller.getFrameAtTime is working properly
        controller.initialize();
        controller.visData.timeStepSize = netConn.timeStep;
        controller.visData.totalSteps = netConn.totalDuration;
    });

    describe("gotoTime", () => {
        test("Moves current frame to valid time", () =>
            new Promise<void>((done) => {
                controller.gotoTime(2);
                setTimeout(() => {
                    expect(controller.time()).toEqual(2);
                    done();
                }, DEFAULT_TIMEOUT);
            }));
        test("Handle time beyond maximum", () =>
            new Promise<void>((done) => {
                controller.gotoTime(101);
                setTimeout(() => {
                    expect(controller.time()).toEqual(99);
                    done();
                }, DEFAULT_TIMEOUT);
            }));
        test("Handle negative time", () =>
            new Promise<void>((done) => {
                controller.gotoTime(-1);
                setTimeout(() => {
                    expect(controller.time()).toEqual(0);
                    done();
                }, DEFAULT_TIMEOUT);
            }));
    });
});
