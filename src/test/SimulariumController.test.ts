import { describe, expect, beforeEach, vi } from "vitest";

import { WebsocketClient } from "../simularium/WebsocketClient";
import { ClientSimulator } from "../simularium/ClientSimulator";
import { LocalFileSimulator } from "../simularium/LocalFileSimulator";
import type { NetConnectionParams } from "../simularium/WebsocketClient";
import { IClientSimulatorImpl, RemoteSimulator } from "../simularium";
import { makeBinary, pad } from "./BinaryFile.test";
import BinaryFileReader from "../simularium/BinaryFileReader";
import TestClientSimulatorImpl from "./TestClientSimulatorImpl";
import { DummyRemoteSimulator } from "./DummyRemoteSimulator";
import { TrajectoryType } from "../constants";
import { DummyOctopusServicesClient } from "./DummyOctopusClient";
import SimulariumController from "../controller";
import {
    LocalFileSimulatorParams,
    LocalProceduralSimulatorParams,
    RemoteSimulatorParams,
} from "../simularium/types";

// build test binary local file, borrowed from `src/test/BinaryFile.test.ts`
const buffer = makeBinary(
    [
        pad(
            new TextEncoder().encode(
                JSON.stringify({
                    msgType: 0,
                    version: 2,
                    timeStepSize: 1,
                    totalSteps: 1,
                    size: [7, 7, 7],
                    typeMapping: {},
                })
            )
        ),
        pad(new ArrayBuffer(8)),
        pad(new TextEncoder().encode(JSON.stringify({ data: { baz: "bat" } }))),
    ],
    [1, 3, 2]
);
const binarySimFile = new BinaryFileReader(buffer);

export const LocalFileTestParams: LocalFileSimulatorParams = {
    fileName: "local.simularium",
    simulariumFile: binarySimFile,
};

export const ProceduralSimTestParams: LocalProceduralSimulatorParams = {
    fileName: "procedural",
    clientSimulatorImpl: new TestClientSimulatorImpl(),
};

const dummyNetConnection: NetConnectionParams = {
    serverIp: "0.0.0.0",
    serverPort: 1234,
};

export const RemoteSimTestParams: RemoteSimulatorParams = {
    fileName: "remote",
    netConnectionSettings: dummyNetConnection,
};

const makeControllerWithDummyRemote = (): SimulariumController => {
    const controller = new SimulariumController();
    // mocking to bypass network configuration and network validity checks
    vi.spyOn(controller, "buildSimulator").mockImplementation(() => {
        return new DummyRemoteSimulator({});
    });
    vi.spyOn(controller, "configureNetwork").mockImplementation(() => {
        return Promise.resolve("Connected");
    });
    controller.remoteWebsocketClient = new WebsocketClient();
    controller.octopusClient = new DummyOctopusServicesClient({});
    return controller;
};

describe("SimulariumController", () => {
    let controller: SimulariumController;

    beforeEach(() => {
        controller = new SimulariumController();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("buildSimulator()", () => {
        test("should configure a LocalFileSimulator if a local file params are provided", () => {
            const simulator = controller.buildSimulator(LocalFileTestParams);
            expect(simulator instanceof LocalFileSimulator).toBe(true);
            expect(simulator instanceof ClientSimulator).toBe(false);
            expect(simulator instanceof RemoteSimulator).toBe(false);
        });
        test("should configure a ClientSimulator if a procedural params are provided", () => {
            const simulator = controller.buildSimulator(
                ProceduralSimTestParams
            );
            expect(simulator instanceof ClientSimulator).toBe(true);
            expect(simulator instanceof LocalFileSimulator).toBe(false);
            expect(simulator instanceof RemoteSimulator).toBe(false);
        });
        test("should configure a RemoteSimulator if a remote params are provided", () => {
            const simulator = controller.buildSimulator(RemoteSimTestParams);
            expect(simulator instanceof RemoteSimulator).toBe(true);
            expect(simulator instanceof ClientSimulator).toBe(false);
            expect(simulator instanceof LocalFileSimulator).toBe(false);
        });
    });

    describe("changeFile() with Local File", () => {
        test("should configure a LocalFileSimulator if a simulariumFile is provided", async () => {
            controller.changeFile(LocalFileTestParams);
            expect(controller.isSimulatorConfigured()).toBe(true);
            expect(controller.simulator instanceof LocalFileSimulator).toBe(
                true
            );
            expect(controller.simulator instanceof ClientSimulator).toBe(false);
            expect(controller.simulator instanceof RemoteSimulator).toBe(false);
            expect(controller.getFile()).toBe("local.simularium");
        });

        test("sets playBackFile to match incoming params", async () => {
            controller.changeFile(LocalFileTestParams);
            expect(controller.getFile()).toBe("local.simularium");
        });

        test("goes to frame zero after changing files", async () => {
            controller.changeFile(LocalFileTestParams);
            setTimeout(() => {
                expect(controller.time()).toEqual(0);
            }, 500);
        });
        test("throws error if fileName is not .simularium", async () => {
            await expect(
                controller.changeFile({
                    fileName: "notSimularium.txt",
                    simulariumFile: binarySimFile,
                })
            ).rejects.toThrow("File must be a .simularium file");
        });
    });

    describe("changeFile() with Local Procedural Simulator", () => {
        test("configures a ClientSimulator when clientSimulatorImpl is provided", async () => {
            controller.changeFile(ProceduralSimTestParams);
            expect(controller.isSimulatorConfigured()).toBe(true);
            expect(controller.simulator instanceof ClientSimulator).toBe(true);
            expect(controller.simulator instanceof LocalFileSimulator).toBe(
                false
            );
            expect(controller.simulator instanceof RemoteSimulator).toBe(false);
            expect(controller.getFile()).toBe("procedural");
        });
        test("sets playBackFile to match incoming params", async () => {
            controller.changeFile(ProceduralSimTestParams);
            expect(controller.getFile()).toBe("procedural");
        });
        test("localSimulator on ClientSimulator should match params", async () => {
            controller.changeFile(ProceduralSimTestParams);
            let impl: IClientSimulatorImpl | null = null;
            if (controller.simulator instanceof ClientSimulator) {
                impl = controller.simulator.localSimulator;
            }
            expect(impl instanceof TestClientSimulatorImpl).toBe(true);
        });
    });

    test("Should change from one simulator type to another", () => {
        controller.changeFile(LocalFileTestParams);
        controller.changeFile(ProceduralSimTestParams);
        expect(controller.isSimulatorConfigured()).toBe(true);
        expect(controller.simulator instanceof ClientSimulator).toBe(true);
        expect(controller.simulator instanceof RemoteSimulator).toBe(false);
        expect(controller.simulator instanceof LocalFileSimulator).toBe(false);
        expect(controller.getFile()).toBe("procedural");
    });

    describe("SimulariumController (Remote Simulator tests)", () => {
        let controller: SimulariumController;

        beforeEach(() => {
            controller = makeControllerWithDummyRemote();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe("changeFile() with RemoteSimulator", () => {
            test("Should configure a RemoteSimulator when remote params are provided", () => {
                controller.changeFile(RemoteSimTestParams);
                expect(controller.isSimulatorConfigured()).toBe(true);
                expect(controller.simulator instanceof RemoteSimulator).toBe(
                    true
                );
                expect(controller.simulator instanceof ClientSimulator).toBe(
                    false
                );
                expect(controller.simulator instanceof LocalFileSimulator).toBe(
                    false
                );
                expect(controller.getFile()).toBe("remote");
            });
            test("sets playBackFile to match incoming params", async () => {
                controller.changeFile(RemoteSimTestParams);
                expect(controller.getFile()).toBe("remote");
            });
        });

        describe("convertTrajectory()", () => {
            test("should configure a remote simulator", () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "conversion"
                );
                expect(controller.simulator instanceof RemoteSimulator).toBe(
                    true
                );
            });

            test("octopus client last requested file matches the conversion filename", () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "conversion"
                );
                expect(controller.octopusClient?.lastRequestedFile).toBe(
                    "conversion"
                );
            });

            test("controller’s getFile() matches the filename", () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "file.simularium"
                );
                expect(controller.getFile()).toBe("file.simularium");
            });

            test("time should be zero after starting", async () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "file.simularium"
                );
                setTimeout(() => {
                    expect(controller.time()).toEqual(0);
                }, 2500);
            });
            test("cancel should reset lastRequestedFileName", async () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "file.simularium"
                );
                controller.cancelConversion();
                expect(controller.octopusClient?.lastRequestedFile).toBe("");
                setTimeout(() => {
                    expect(controller.octopusClient?.lastRequestedFile).toBe(
                        ""
                    );
                }, 2500);
            });
            test("after cancel should time should be -1", async () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "file.simularium"
                );
                controller.cancelConversion();
                expect(controller.time()).toEqual(-1);
                setTimeout(() => {
                    expect(controller.time()).toEqual(-1);
                }, 2500);
            });
            test("changeFile should cancel conversion and reset fileName", async () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "file.simularium"
                );
                controller.changeFile(LocalFileTestParams);
                expect(controller.octopusClient?.lastRequestedFile).toBe("");
                expect(controller.isSimulatorConfigured()).toBe(true);
                expect(controller.getFile()).toBe("local.simularium");
                setTimeout(() => {
                    expect(controller.octopusClient?.lastRequestedFile).toBe(
                        ""
                    );
                }, 2500);
            });
            test("changeFile should cancel conversion, set time to -1, and take time to 0 after loading new file", async () => {
                controller.convertTrajectory(
                    dummyNetConnection,
                    {},
                    TrajectoryType.SMOLDYN,
                    "file.simularium"
                );
                controller.changeFile(LocalFileTestParams);
                expect(controller.time()).toEqual(-1);
                setTimeout(() => {
                    expect(controller.time()).toEqual(0);
                }, 2500);
            });
        });

        describe("startSmoldynSim()", () => {
            test("configures a remote simulator", () => {
                controller.startSmoldynSim(
                    dummyNetConnection,
                    "bioSimulatorsRun",
                    "inputData"
                );
                expect(controller.simulator instanceof RemoteSimulator).toBe(
                    true
                );
            });

            test("octopus client last requested file should match the provided filename", () => {
                controller.startSmoldynSim(
                    dummyNetConnection,
                    "bioSimulatorsRun",
                    "inputData"
                );
                expect(controller.octopusClient?.lastRequestedFile).toBe(
                    "bioSimulatorsRun"
                );
            });

            test("controller.getFile() should match the new file name", () => {
                controller.startSmoldynSim(
                    dummyNetConnection,
                    "bioSimulatorsRun",
                    "inputData"
                );
                expect(controller.getFile()).toBe("bioSimulatorsRun");
            });

            test("time should be zero after starting", async () => {
                controller.startSmoldynSim(
                    dummyNetConnection,
                    "bioSimulatorsRun",
                    "inputData"
                );
                setTimeout(() => {
                    expect(controller.time()).toEqual(0);
                }, 2500);
            });
        });
    });

    describe("clearFile()", () => {
        test("should clear the simulator", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.clearFile();
            expect(controller.isSimulatorConfigured()).toBe(false);
        });
        test("should set the controller to paused", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.clearFile();
            expect(controller.paused()).toBe(true);
        });
        test("should set time to -1", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.clearFile();
            expect(controller.getFile()).toBe("");
            expect(controller.time()).toEqual(-1);
        });
        test("should reset playbackfile", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.clearFile();
            expect(controller.getFile()).toBe("");
        });
    });

    describe("start", () => {
        test("should resolve when simulator initializes successfully", async () => {
            await controller.changeFile(LocalFileTestParams);
            await expect(controller.start()).resolves.toBeUndefined();
        });

        test("should reject if no simulator exists", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.simulator = undefined;
            await expect(controller.start()).rejects.toBeUndefined();
        });
    });

    describe("goToTime", () => {
        test("Go to time in cache", () => {
            controller.changeFile({
                fileName: "remote",
                netConnectionSettings: dummyNetConnection,
            });
            controller.gotoTime(2);
            setTimeout(() => {
                expect(controller.time()).toEqual(2);
            }, 500);
        });
    });
});
