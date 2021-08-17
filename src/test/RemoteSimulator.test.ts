import { RemoteSimulator } from "..";

describe("RemoteSimulator", () => {
    describe("startRemoteTrajectoryPlayback", () => {
        test("logs error", () => {
            // TODO: mock connectToRemoteServer so it returns an error
            const remoteSimulator = new RemoteSimulator({
                serverIp: "staging-node1-agentviz-backend.cellexplore.net",
                serverPort: 9002,
            });

            remoteSimulator.startRemoteTrajectoryPlayback(
                "endocytosis.simularium"
            );
        });
    });
    describe("connectToRemoteServer", () => {
        test("successfully connects", async () => {
            const remoteSimulator = new RemoteSimulator({
                serverIp: "staging-node1-agentviz-backend.cellexplore.net",
                serverPort: 9002,
            });

            const result = await remoteSimulator.connectToRemoteServer(
                "wss://staging-node1-agentviz-backend.cellexplore.net:9002"
            );

            expect(result).toEqual("Remote sim successfully started");
        });
        test("emits error if timeout is too short", async () => {
            const remoteSimulator = new RemoteSimulator({
                serverIp: "staging-node1-agentviz-backend.cellexplore.net",
                serverPort: 9002,
            });
            const veryShortTimeout = 1;

            try {
                await remoteSimulator.connectToRemoteServer(
                    "wss://staging-node1-agentviz-backend.cellexplore.net:9002",
                    veryShortTimeout
                );
            } catch (result) {
                expect(result).toEqual(
                    new Error(
                        "Failed to connected to requested server, try reloading. If problem keeps occurring check your connection speed"
                    )
                );
            }
        });
    });
});
