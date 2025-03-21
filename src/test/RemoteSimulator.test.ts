import { vi, describe, test, expect } from "vitest";
import {
    NetMessageEnum,
    MessageEventLike,
} from "../simularium/WebsocketClient.js";
import { RemoteSimulator } from "../index.js";
import { WebsocketClient } from "../simularium/WebsocketClient.js";

describe("RemoteSimulator", () => {
    // Silence console.debug messages like this in Vitest output:
    // "[netconnection] WS Connection Request Sent:  wss://..."
    vi.spyOn(global.console, "debug").mockImplementation(() => vi.fn());

    const CONNECTION_SETTINGS = {
        serverIp: "dummy.uri.com",
        serverPort: 1234,
    };

    let simulator;
    let websocketClient;

    beforeEach(() => {
        simulator = new RemoteSimulator(CONNECTION_SETTINGS, "trajectory.sim");
        websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
        simulator["_webSocketClient"] = websocketClient;
    });

    const createFakeBinary = () => {
        const encoder = new TextEncoder();
        const fileNameBytes = encoder.encode("fileA");
        const nameLength = fileNameBytes.length;
        const totalLength = 8 + nameLength;
        const paddedLength =
            totalLength % 4 === 0
                ? totalLength
                : totalLength + (4 - (totalLength % 4));
        const buffer = new ArrayBuffer(paddedLength);
        const floatView = new Float32Array(buffer);
        floatView[1] = nameLength;
        const byteView = new Uint8Array(buffer);
        byteView.set(fileNameBytes, 8);

        return buffer;
    };

    describe("initialize", () => {
        beforeEach(() => {
            vi.spyOn(simulator, "connectToRemoteServer").mockResolvedValue(
                "Connected to remote server"
            );
            vi.spyOn(
                websocketClient,
                "sendWebSocketRequest"
            ).mockImplementation(() => {
                /* stubbed */
            });
        });
        test("calls onConnected and sends initial trajectory file request", async () => {
            simulator["_webSocketClient"] = websocketClient;
            vi.spyOn(simulator, "onConnected").mockImplementation(() => {
                websocketClient.sendWebSocketRequest(
                    {
                        msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
                        fileName: "trajectory.sim",
                    },
                    "Start Trajectory File Playback"
                );
                return "onConnected";
            });

            await simulator.initialize("trajectory.sim");
            expect(simulator.onConnected).toHaveBeenCalled();
            expect(websocketClient.sendWebSocketRequest).toHaveBeenCalledWith(
                {
                    msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
                    fileName: "trajectory.sim",
                },
                "Start Trajectory File Playback"
            );
        });

        test("handleError is called if connectToRemoteServer fails", async () => {
            const errorHandler = vi.fn();
            const simulator = new RemoteSimulator(
                CONNECTION_SETTINGS,
                "trajectory.sim",
                errorHandler
            );
            vi.spyOn(simulator, "connectToRemoteServer").mockRejectedValue(
                new Error("Connection failed")
            );
            await simulator.initialize("trajectory.sim");
            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe("onBinaryIdVisDataArrive", () => {
        function setupBinaryTest(fileName) {
            const buffer = createFakeBinary();
            const fakeEvent = { data: buffer } as MessageEventLike;
            return { buffer, fakeEvent };
        }

        test("calls onTrajectoryDataArrive when file name matches", () => {
            simulator.lastRequestedFile = "fileA";
            const { buffer, fakeEvent } = setupBinaryTest("fileA");

            const dataSpy = vi.spyOn(simulator, "onTrajectoryDataArrive");
            simulator.onBinaryIdVisDataArrive(fakeEvent);

            expect(dataSpy).toHaveBeenCalledWith(buffer);
        });

        test("does not call onTrajectoryDataArrive when file name does not match", () => {
            simulator.lastRequestedFile = "otherFile";
            const { fakeEvent } = setupBinaryTest("fileA");

            const dataSpy = vi.spyOn(simulator, "onTrajectoryDataArrive");
            simulator.onBinaryIdVisDataArrive(fakeEvent);

            expect(dataSpy).not.toHaveBeenCalled();
        });
    });
});
