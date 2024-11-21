import { vi } from "vitest";

import {
    CONNECTION_SUCCESS_MSG,
    CONNECTION_FAIL_MSG,
} from "../simularium/WebsocketClient";
import { FrontEndError } from "../simularium/FrontEndError";
import { RemoteSimulator } from "..";
import { WebsocketClient } from "../simularium/WebsocketClient";

describe("RemoteSimulator", () => {
    // Silence console.debug messages like this in Jest output:
    // "[netconnection] WS Connection Request Sent:  wss://..."
    vi.spyOn(global.console, "debug").mockImplementation(() => vi.fn());

    const CONNECTION_SETTINGS = {
        serverIp: "dummy.uri.com",
        serverPort: 1234,
    };

    describe("createWebSocket", () => {
        test("creates a WebSocket object", () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            const simulator = new RemoteSimulator(websocketClient);
            expect(simulator.socketIsValid()).toBe(false);

            websocketClient.createWebSocket(simulator.getIp());
            expect(simulator.socketIsValid()).toBe(true);
        });
    });

    describe("checkConnection", () => {
        const timeout = 1000;

        test("returns true if connection succeeds within allotted time with no retries", async () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            const simulator = new RemoteSimulator(websocketClient);
            vi.spyOn(websocketClient, "waitForWebSocket").mockResolvedValue(
                true
            );

            const isConnected = await websocketClient.checkConnection(
                simulator.getIp(),
                timeout
            );
            expect(isConnected).toBe(true);
            expect(simulator.webSocketClient.connectionTimeWaited).toBe(
                timeout
            );
            expect(simulator.webSocketClient.connectionRetries).toBe(0);
        });
        test("returns false if connection does not succeed within allotted time and number of retries", async () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            const simulator = new RemoteSimulator(websocketClient);
            vi.spyOn(websocketClient, "waitForWebSocket").mockResolvedValue(
                false
            );

            const isConnected = await websocketClient.checkConnection(
                simulator.getIp(),
                timeout
            );
            expect(isConnected).toBe(false);
            // Expect 4 timeouts on initial connection + 1 timeout on retry connection
            expect(simulator.webSocketClient.connectionTimeWaited).toBe(
                timeout * 5
            );
            expect(simulator.webSocketClient.connectionRetries).toBe(1);
        });
        test("returns true if connection succeeds on the retry", async () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            const simulator = new RemoteSimulator(websocketClient);
            const waitForWebSocket = vi.spyOn(
                websocketClient,
                "waitForWebSocket"
            );
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(true);

            const isConnected = await websocketClient.checkConnection(
                simulator.getIp(),
                timeout
            );
            expect(isConnected).toBe(true);
            // Expect 4 timeouts on initial connection + 1 timeout on retry connection
            expect(websocketClient.connectionTimeWaited).toBe(timeout * 5);
            expect(websocketClient.connectionRetries).toBe(1);
        });
    });

    describe("connectToRemoteServer", () => {
        test("emits a 'connection success' message if connection succeeds", async () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            vi.spyOn(websocketClient, "checkConnection").mockResolvedValue(
                true
            );

            const message = await websocketClient.connectToRemoteServer();
            expect(message).toEqual(CONNECTION_SUCCESS_MSG);
        });
        test("emits error if connecting to server is unsuccessful", async () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            vi.spyOn(websocketClient, "checkConnection").mockResolvedValue(
                false
            );

            try {
                await websocketClient.connectToRemoteServer();
            } catch (error) {
                expect(error).toEqual(new Error(CONNECTION_FAIL_MSG));
            }
        });
    });

    describe("startRemoteTrajectoryPlayback", () => {
        test("does not throw error if connectToRemoteServer succeeds", async () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            const simulator = new RemoteSimulator(websocketClient);
            vi.spyOn(simulator, "connectToRemoteServer").mockResolvedValue(
                CONNECTION_SUCCESS_MSG
            );

            expect(
                async () =>
                    await simulator.startRemoteTrajectoryPlayback(
                        "endocytosis.simularium"
                    )
            ).not.toThrow();
        });
        test("throws error emitted by connectToRemoteServer as a FrontEndError if connection fails", async () => {
            const websocketClient = new WebsocketClient(CONNECTION_SETTINGS);
            const simulator = new RemoteSimulator(websocketClient);
            vi.spyOn(simulator, "connectToRemoteServer").mockRejectedValue(
                new Error("Mock error message")
            );

            try {
                await simulator.startRemoteTrajectoryPlayback(
                    "endocytosis.simularium"
                );
            } catch (error) {
                expect(error).toEqual(new FrontEndError("Mock error message"));
            }
        });
    });
});
