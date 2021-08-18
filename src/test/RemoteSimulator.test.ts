import { RemoteSimulator } from "..";
import FrontEndError from "../simularium/FrontEndError";

describe("RemoteSimulator", () => {
    const simulatorParams = {
        serverIp: "staging-node1-agentviz-backend.cellexplore.net",
        serverPort: 9002,
    };
    const serverUri = `wss://${simulatorParams.serverIp}:${simulatorParams.serverPort}`;

    // Silence console.debug messages like this in Jest output:
    // "[netconnection] WS Connection Request Sent:  wss://..."
    jest.spyOn(global.console, "debug").mockImplementation(() => jest.fn());

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
            expect(message).toEqual("Remote sim successfully started");
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
                expect(error).toEqual(
                    new Error(
                        "Failed to connected to requested server, try reloading. If problem keeps occurring check your connection speed"
                    )
                );
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
            ).mockRejectedValue(new Error("Failed to connect"));

            try {
                await remoteSimulator.startRemoteTrajectoryPlayback(
                    "endocytosis.simularium"
                );
            } catch (error) {
                expect(error).toEqual(new FrontEndError("Failed to connect"));
            }
        });
    });
});
