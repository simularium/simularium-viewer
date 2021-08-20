import {
    CONNECTION_SUCCESS_MSG,
    CONNECTION_FAIL_MSG,
} from "../simularium/RemoteSimulator";
import FrontEndError from "../simularium/FrontEndError";
import { RemoteSimulator } from "..";

import { TEST_CONNECTION_SETTINGS } from "../constants";

describe("RemoteSimulator", () => {
    // Silence console.debug messages like this in Jest output:
    // "[netconnection] WS Connection Request Sent:  wss://..."
    // jest.spyOn(global.console, "debug").mockImplementation(() => jest.fn());

    const CONNECTION_SETTINGS = {
        serverIp: "dummy.uri.com",
        serverPort: 1234,
    };

    describe("createWebSocket", () => {
        test("creates a WebSocket object", () => {
            const simulator = new RemoteSimulator({});
            expect(simulator.socketIsValid()).toBe(false);

            simulator.createWebSocket(simulator.getIp());
            expect(simulator.socketIsValid()).toBe(true);
        });
    });

    describe("connectToRemoteServer", () => {
        test("emits a 'connection success' message if connection succeeds", async () => {
            const simulator = new RemoteSimulator(TEST_CONNECTION_SETTINGS);

            const message = await simulator.connectToRemoteServer(
                simulator.getIp()
            );
            expect(message).toEqual(CONNECTION_SUCCESS_MSG);
        });
        test("emits error if connecting to server takes longer than allotted time", async () => {
            const simulator = new RemoteSimulator(TEST_CONNECTION_SETTINGS);
            const veryShortTimeout = 1;

            try {
                await simulator.connectToRemoteServer(
                    simulator.getIp(),
                    veryShortTimeout
                );
            } catch (error) {
                expect(error).toEqual(new Error(CONNECTION_FAIL_MSG));
            }
        });
    });

    describe("startRemoteTrajectoryPlayback", () => {
        test("sends WebSocket request to start playback", async () => {
            const simulator = new RemoteSimulator(TEST_CONNECTION_SETTINGS);
            const request = jest.spyOn(simulator, "sendWebSocketRequest");
            expect(request).not.toBeCalled();

            await simulator.startRemoteTrajectoryPlayback(
                "endocytosis.simularium"
            );
            expect(request).toBeCalled();
        });
        test("throws error emitted by connectToRemoteServer as a FrontEndError if connection fails", async () => {
            const simulator = new RemoteSimulator(TEST_CONNECTION_SETTINGS);
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
