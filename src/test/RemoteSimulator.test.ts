import { vi, describe, test, expect } from "vitest";
import {
    NetMessageEnum,
    MessageEventLike,
} from "../simularium/WebsocketClient.js";
import { RemoteSimulator } from "../index.js";

describe("RemoteSimulator", () => {
    // Silence console.debug messages like this in Vitest output:
    // "[netconnection] WS Connection Request Sent:  wss://..."
    vi.spyOn(global.console, "debug").mockImplementation(() => vi.fn());

    const CONNECTION_SETTINGS = {
        serverIp: "dummy.uri.com",
        serverPort: 1234,
    };

    let simulator;

    beforeEach(() => {
        simulator = new RemoteSimulator(CONNECTION_SETTINGS);
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
            vi.spyOn(
                simulator.webSocketClient,
                "connectToRemoteServer"
            ).mockResolvedValue("Connected to remote server");
            vi.spyOn(
                simulator.webSocketClient,
                "sendWebSocketRequest"
            ).mockImplementation(() => {
                /* stubbed */
            });
        });
        test("sends initial trajectory file request", async () => {
            await simulator.initialize("trajectory.sim");

            expect(
                simulator.webSocketClient.sendWebSocketRequest
            ).toHaveBeenCalledWith(
                {
                    msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
                    fileName: "trajectory.sim",
                },
                "Start Trajectory File Playback"
            );
        });
        test("registers message handlers", async () => {
            await simulator.initialize("trajectory.sim");
            expect(
                simulator.webSocketClient.binaryMessageHandlers[
                    NetMessageEnum.ID_VIS_DATA_ARRIVE
                ]
            ).toBeTruthy();
            expect(
                simulator.webSocketClient.jsonMessageHandlers[
                    NetMessageEnum.ID_TRAJECTORY_FILE_INFO
                ]
            ).toBeTruthy();
        });

        test("handleError is called if connectToRemoteServer fails", async () => {
            const errorHandler = vi.fn();
            const simulator = new RemoteSimulator(
                CONNECTION_SETTINGS,
                errorHandler
            );
            vi.spyOn(
                simulator.webSocketClient,
                "connectToRemoteServer"
            ).mockRejectedValue(new Error("Connection failed"));
            await simulator.initialize("trajectory.sim");
            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe("onBinaryIdVisDataArrive", () => {
        function setupBinaryTest() {
            const buffer = createFakeBinary();
            const fakeEvent = { data: buffer } as MessageEventLike;
            return { buffer, fakeEvent };
        }

        test("calls onTrajectoryDataArrive when file name matches", () => {
            simulator.lastRequestedFile = "fileA";
            const { buffer, fakeEvent } = setupBinaryTest();

            const dataSpy = vi.spyOn(simulator, "onTrajectoryDataArrive");
            simulator.onBinaryIdVisDataArrive(fakeEvent);

            expect(dataSpy).toHaveBeenCalledWith(buffer);
        });

        test("does not call onTrajectoryDataArrive when file name does not match", () => {
            simulator.lastRequestedFile = "otherFile";
            const { fakeEvent } = setupBinaryTest();

            const dataSpy = vi.spyOn(simulator, "onTrajectoryDataArrive");
            simulator.onBinaryIdVisDataArrive(fakeEvent);

            expect(dataSpy).not.toHaveBeenCalled();
        });
    });
});
