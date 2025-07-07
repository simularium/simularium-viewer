import { describe, expect, beforeEach, vi } from "vitest";
import TestClientSimulatorImpl from "./TestClientSimulatorImpl";
import { DummyRemoteSimulator } from "./DummyRemoteSimulator";
import type { NetConnectionParams } from "../simularium/WebsocketClient";
import BinaryFileReader from "../simularium/BinaryFileReader";
import {
    ClientSimulatorParams,
    LocalFileSimulatorParams,
    RemoteSimulatorParams,
    SimulatorParams,
} from "../Simulator/types";
import { ClientSimulator } from "../Simulator/ClientSimulator";
import { LocalFileSimulator } from "../Simulator/LocalFileSimulator";
import { FILE_STATUS_FAIL, FILE_STATUS_SUCCESS } from "../simularium/types";
import {
    FrontEndError,
    IClientSimulatorImpl,
    RemoteSimulator,
} from "../simularium";
import { TrajectoryType } from "../constants";
import SimulariumController from "../controller";
import { pad, makeBinary } from "./utils";

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

export const ClientSimTestParams: ClientSimulatorParams = {
    fileName: "clientsim",
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

const mockConversionClient = {
    setOnConversionCompleteHandler: vi.fn().mockImplementation(() => {
        console.log("mocked handler");
    }),
    cancelConversion: vi.fn(),
    disconnect: vi.fn(),
    convertTrajectory: vi.fn().mockResolvedValue(undefined),
    sendSmoldynData: vi.fn().mockResolvedValue(undefined),
    lastRequestedFile: "",
};

vi.mock("../simularium/ConversionClient.js", () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ConversionClient: vi.fn().mockImplementation(() => mockConversionClient),
}));

vi.mock("../Simulator/SimulatorFactory", async () => {
    const actual = await vi.importActual<
        typeof import("../Simulator/SimulatorFactory")
    >("../Simulator/SimulatorFactory");

    return {
        ...actual,
        getSimulatorClassFromParams: (params?: SimulatorParams) => {
            const result = actual.getSimulatorClassFromParams(params);
            if (result.simulatorClass === RemoteSimulator) {
                return { ...result, simulatorClass: DummyRemoteSimulator };
            }
            return result;
        },
    };
});

describe("SimulariumController", () => {
    let controller: SimulariumController;
    let errorHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        errorHandler = vi.fn();
        controller = new SimulariumController();
        controller.onError = errorHandler;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("changeFile", () => {
        test("handles a local file", async () => {
            await expect(
                controller.changeFile(LocalFileTestParams)
            ).resolves.toStrictEqual({
                status: FILE_STATUS_SUCCESS,
            });

            expect(controller.simulator).toBeInstanceOf(LocalFileSimulator);
            expect(controller.getFile()).toBe(LocalFileTestParams.fileName);
        });

        test("rejects if file extension is not .simularium for local file", async () => {
            await expect(
                controller.changeFile({
                    fileName: "notSimularium.txt",
                    simulariumFile: binarySimFile,
                })
            ).rejects.toEqual({ status: FILE_STATUS_FAIL });
        });

        test("calls handleError() if invalid simulator config is encountered", async () => {
            await controller
                .changeFile({
                    fileName: "notSimularium.txt",
                    simulariumFile: binarySimFile,
                })
                .catch(() => {
                    console.log("error");
                });
            expect(errorHandler).toHaveBeenCalled();
            expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(FrontEndError);
            expect(errorHandler.mock.calls[0][0].message).toBe(
                "File must be a .simularium file"
            );
        });

        it("returns FILE_STATUS_FAIL and calls onError if initialise rejects", async () => {
            const err = new Error("init fail");
            vi.spyOn(
                LocalFileSimulator.prototype,
                "initialize"
            ).mockRejectedValue(err);

            await expect(
                controller.changeFile(LocalFileTestParams)
            ).resolves.toStrictEqual({ status: FILE_STATUS_FAIL });

            expect(errorHandler).toHaveBeenCalledWith(err);
        });

        test("handles a client sim", async () => {
            await expect(
                controller.changeFile(ClientSimTestParams)
            ).resolves.toStrictEqual({
                status: FILE_STATUS_SUCCESS,
            });

            expect(controller.simulator).toBeInstanceOf(ClientSimulator);
            expect(controller.getFile()).toBe(ClientSimTestParams.fileName);
        });

        test("localSimulator on ClientSimulator should match params", async () => {
            await controller.changeFile(ClientSimTestParams);
            let clientSim: IClientSimulatorImpl | null = null;
            if (controller.simulator instanceof ClientSimulator) {
                // @ts-expect-error testing private property
                clientSim = controller.simulator.localSimulator;
            }
            expect(clientSim instanceof TestClientSimulatorImpl).toBe(true);
        });

        test("handles a remote trajectory", async () => {
            await expect(
                controller.changeFile(RemoteSimTestParams)
            ).resolves.toStrictEqual({
                status: FILE_STATUS_SUCCESS,
            });

            expect(controller.simulator).toBeInstanceOf(RemoteSimulator);
            expect(controller.getFile()).toBe(RemoteSimTestParams.fileName);
        });

        test("reuses remote simulator if net settings haven't changed", async () => {
            await controller.changeFile(RemoteSimTestParams);
            const firstSimulator = controller.simulator;
            const newParams = {
                fileName: "newRemoteFile",
                netConnectionSettings: dummyNetConnection,
            };
            await controller.changeFile(newParams);
            const secondSimulator = controller.simulator;
            expect(secondSimulator).toBe(firstSimulator);
        });

        test("does NOT reuse if net settings changed", async () => {
            await controller.changeFile(RemoteSimTestParams);
            const firstSimulator = controller.simulator;
            const newParams: RemoteSimulatorParams = {
                fileName: "newRemoteFile",
                netConnectionSettings: {
                    serverIp: "1.2.3.4",
                    serverPort: 5678, // different port
                },
            };
            await controller.changeFile(newParams);
            expect(controller.simulator).not.toBe(firstSimulator);
        });

        test("should change from one simulator type to another", async () => {
            await controller.changeFile(LocalFileTestParams);
            await expect(
                controller.changeFile(ClientSimTestParams)
            ).resolves.toStrictEqual({
                status: FILE_STATUS_SUCCESS,
            });

            expect(controller.simulator).toBeInstanceOf(ClientSimulator);
            expect(controller.getFile()).toBe(ClientSimTestParams.fileName);
        });

        it("initialises new simulator and requests frame 0", async () => {
            vi.spyOn(
                LocalFileSimulator.prototype,
                "initialize"
            ).mockResolvedValue(undefined);
            const reqSpy = vi
                .spyOn(LocalFileSimulator.prototype, "requestFrame")
                .mockImplementation(vi.fn());

            await controller.changeFile(LocalFileTestParams);

            expect(reqSpy).toHaveBeenCalledWith(0);
        });
    });

    describe("convertTrajectory()", () => {
        // Because we mocked ConversionClient above, we can check calls
        // this doesn't test the internal functionality of ConversionClient
        test("sets up conversion client and calls convertTrajectory", async () => {
            await controller.convertTrajectory(
                dummyNetConnection,
                { some: "data" },
                TrajectoryType.SMOLDYN,
                "test.simularium"
            );

            expect(controller.conversionClient).toBeTruthy();
            expect(
                controller.conversionClient.convertTrajectory
            ).toHaveBeenCalledWith(
                { some: "data" },
                TrajectoryType.SMOLDYN,
                "test.simularium"
            );
        });

        test("calls closeConversionConnection() and resets client on cancelConversion()", async () => {
            await controller.convertTrajectory(
                dummyNetConnection,
                { some: "data" },
                TrajectoryType.SMOLDYN,
                "test.simularium"
            );
            expect(controller.conversionClient).toBeTruthy();
            controller.cancelConversion();
            expect(mockConversionClient.cancelConversion).toHaveBeenCalled();
            expect(mockConversionClient.disconnect).toHaveBeenCalled();
            expect(() => controller.conversionClient).toThrow(
                "Conversion client is not configured."
            );
            expect(controller.time()).toBe(-1);
        });

        test("changeFile() cancels any existing conversion and sets new file", async () => {
            await controller.convertTrajectory(
                dummyNetConnection,
                {},
                TrajectoryType.SMOLDYN,
                "file.simularium"
            );
            await controller.changeFile({
                netConnectionSettings: dummyNetConnection,
                fileName: "test",
            });
            expect(mockConversionClient.cancelConversion).toHaveBeenCalled();
            expect(controller.getFile()).toBe("test");
        });
    });

    describe("startSmoldynSim()", () => {
        test("sets up conversion client and calls sendSmoldynData", async () => {
            await controller.startSmoldynSim(
                dummyNetConnection,
                "mysim.simularium",
                "smoldyn input"
            );
            expect(controller.conversionClient).toBeTruthy();
            expect(
                controller.conversionClient.sendSmoldynData
            ).toHaveBeenCalledWith("mysim.simularium", "smoldyn input");
        });

        test("calls closeConversionConnection() and resets client on cancelConversion()", async () => {
            await controller.startSmoldynSim(
                dummyNetConnection,
                "mysim.simularium",
                "smoldyn input"
            );
            expect(controller.conversionClient).toBeTruthy();
            controller.cancelConversion();
            expect(mockConversionClient.cancelConversion).toHaveBeenCalled();
            expect(mockConversionClient.disconnect).toHaveBeenCalled();
            expect(() => controller.conversionClient).toThrow(
                "Conversion client is not configured."
            );
            expect(controller.time()).toBe(-1);
        });
        test("changeFile() cancels any existing conversion and sets new file", async () => {
            await controller.startSmoldynSim(
                dummyNetConnection,
                "mysim.simularium",
                "smoldyn input"
            );
            await controller.changeFile({
                netConnectionSettings: dummyNetConnection,
                fileName: "test",
            });
            expect(mockConversionClient.cancelConversion).toHaveBeenCalled();
            expect(controller.getFile()).toBe("test");
        });
    });

    describe("clearFile()", () => {
        test("should close any conversion connection", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.clearFile();
            expect(() => controller.conversionClient).toThrow(
                "Conversion client is not configured."
            );
        });
        test("should clear the simulator", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.clearFile();
            expect(controller.simulator).toBeUndefined();
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
        test("should clear the cache", async () => {
            await controller.changeFile(LocalFileTestParams);
            controller.clearFile();
            expect(controller.visData.hasLocalCacheForTime(0)).toBe(false);
        });
    });

    describe("goToTime", () => {
        test("Go to time in cache", async () => {
            await controller.changeFile({
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
