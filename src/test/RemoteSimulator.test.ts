import { RemoteSimulator } from "..";
import FrontEndError from "../simularium/FrontEndError";

describe("RemoteSimulator", () => {
    const simulatorParams = {
        serverIp: "staging-node1-agentviz-backend.cellexplore.net",
        serverPort: 9002,
    };
    const serverUri = `wss://${simulatorParams.serverIp}:${simulatorParams.serverPort}`;

    describe("connectToRemoteServer", () => {
        test("successfully connects", async () => {
            const remoteSimulator = new RemoteSimulator(simulatorParams);

            const result = await remoteSimulator.connectToRemoteServer(
                serverUri
            );

            expect(result).toEqual("Remote sim successfully started");
        });
        test("emits error if timeout is too short", async () => {
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
