import { TEST_CONNECTION_SETTINGS } from "../constants";

import { RemoteSimulator } from "..";
import {
    CONNECTION_SUCCESS_MSG,
    CONNECTION_FAIL_MSG,
} from "../simularium/RemoteSimulator";
import FrontEndError from "../simularium/FrontEndError";

describe("RemoteSimulator", () => {
    // Silence console.debug messages like this in Jest output:
    // "[netconnection] WS Connection Request Sent:  wss://..."
    jest.spyOn(global.console, "debug").mockImplementation(() => jest.fn());

    const simulatorParams = TEST_CONNECTION_SETTINGS;
    const serverUri = `wss://${simulatorParams.serverIp}:${simulatorParams.serverPort}`;

    describe("connectToUri", () => {
        test("creates a valid WebSocket object", () => {
            const simulator = new RemoteSimulator({});
            expect(simulator.socketIsValid()).toBe(false);

            simulator.connectToUri(serverUri);
            expect(simulator.socketIsValid()).toBe(true);
        });
    });

    describe("connectToRemoteServer", () => {
        test("successfully connects to server", async () => {
            const remoteSimulator = new RemoteSimulator(simulatorParams);
            const message = await remoteSimulator.connectToRemoteServer(
                serverUri
            );
            expect(message).toEqual(CONNECTION_SUCCESS_MSG);
        });
        test("emits error if connecting to server takes longer than allotted time", async () => {
            const remoteSimulator = new RemoteSimulator(simulatorParams);
            const veryShortTimeout = 1;

            try {
                await remoteSimulator.connectToRemoteServer(
                    serverUri,
                    veryShortTimeout
                );
            } catch (error) {
                expect(error).toEqual(new Error(CONNECTION_FAIL_MSG));
            }
        });
    });

    describe("startRemoteTrajectoryPlayback", () => {
        test("sends WebSocket request to start playback", async () => {
            const remoteSimulator = new RemoteSimulator(simulatorParams);
            const request = jest.spyOn(remoteSimulator, "sendWebSocketRequest");
            expect(request).not.toBeCalled();

            await remoteSimulator.startRemoteTrajectoryPlayback(
                "endocytosis.simularium"
            );
            expect(request).toBeCalled();
        });
        test("throws error emitted by connectToRemoteServer when connection fails", async () => {
            const remoteSimulator = new RemoteSimulator(simulatorParams);
            jest.spyOn(
                remoteSimulator,
                "connectToRemoteServer"
            ).mockRejectedValue(new Error("Mock error message"));

            try {
                await remoteSimulator.startRemoteTrajectoryPlayback(
                    "endocytosis.simularium"
                );
            } catch (error) {
                expect(error).toEqual(new FrontEndError("Mock error message"));
            }
        });
    });
});
