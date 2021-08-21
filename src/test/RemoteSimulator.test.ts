import {
    CONNECTION_SUCCESS_MSG,
    CONNECTION_FAIL_MSG,
} from "../simularium/RemoteSimulator";
import FrontEndError from "../simularium/FrontEndError";
import { RemoteSimulator } from "..";

describe("RemoteSimulator", () => {
    // Silence console.debug messages like this in Jest output:
    // "[netconnection] WS Connection Request Sent:  wss://..."
    jest.spyOn(global.console, "debug").mockImplementation(() => jest.fn());

    const CONNECTION_SETTINGS = {
        serverIp: "dummy.uri.com",
        serverPort: 1234,
    };

    describe("createWebSocket", () => {
        test("creates a WebSocket object", () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            expect(simulator.socketIsValid()).toBe(false);

            simulator.createWebSocket(simulator.getIp());
            expect(simulator.socketIsValid()).toBe(true);
        });
    });

    describe("checkConnection", () => {
        const timeout = 1000;

        test("returns true if connection succeeds within allotted time with no retries", async () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            jest.spyOn(simulator, "waitForWebSocket").mockResolvedValue(true);

            const isConnected = await simulator.checkConnection(
                simulator.getIp(),
                timeout
            );
            expect(isConnected).toBe(true);
            expect(simulator.connectionTimeWaited).toBe(timeout);
            expect(simulator.connectionRetries).toBe(0);
        });
        test("returns false if connection does not succeed within allotted time and number of retries", async () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            jest.spyOn(simulator, "waitForWebSocket").mockResolvedValue(false);

            const isConnected = await simulator.checkConnection(
                simulator.getIp(),
                timeout
            );
            expect(isConnected).toBe(false);
            // Expect 4 timeouts on initial connection + 1 timeout on retry connection
            expect(simulator.connectionTimeWaited).toBe(timeout * 5);
            expect(simulator.connectionRetries).toBe(1);
        });
        test("returns true if connection succeeds on the retry", async () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            const waitForWebSocket = jest.spyOn(simulator, "waitForWebSocket");
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(false);
            waitForWebSocket.mockResolvedValueOnce(true);

            const isConnected = await simulator.checkConnection(
                simulator.getIp(),
                timeout
            );
            expect(isConnected).toBe(true);
            // Expect 4 timeouts on initial connection + 1 timeout on retry connection
            expect(simulator.connectionTimeWaited).toBe(timeout * 5);
            expect(simulator.connectionRetries).toBe(1);
        });
    });

    describe("connectToRemoteServer", () => {
        test("emits a 'connection success' message if connection succeeds", async () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            jest.spyOn(simulator, "checkConnection").mockResolvedValue(true);

            const message = await simulator.connectToRemoteServer(
                simulator.getIp()
            );
            expect(message).toEqual(CONNECTION_SUCCESS_MSG);
        });
        test("emits error if connecting to server is unsuccessful", async () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            jest.spyOn(simulator, "checkConnection").mockResolvedValue(false);

            try {
                await simulator.connectToRemoteServer(simulator.getIp());
            } catch (error) {
                expect(error).toEqual(new Error(CONNECTION_FAIL_MSG));
            }
        });
    });

    describe("startRemoteTrajectoryPlayback", () => {
        test("sends WebSocket request to start playback", async () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            jest.spyOn(simulator, "connectToRemoteServer").mockResolvedValue(
                CONNECTION_SUCCESS_MSG
            );
            const request = jest.spyOn(simulator, "sendWebSocketRequest");

            await simulator.startRemoteTrajectoryPlayback(
                "endocytosis.simularium"
            );
            expect(request).toBeCalled();
        });
        test("throws error emitted by connectToRemoteServer as a FrontEndError if connection fails", async () => {
            const simulator = new RemoteSimulator(CONNECTION_SETTINGS);
            jest.spyOn(simulator, "connectToRemoteServer").mockRejectedValue(
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
