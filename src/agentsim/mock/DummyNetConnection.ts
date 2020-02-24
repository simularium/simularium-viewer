import { NetConnection } from "../";

// TODO: add dummy data, dummy functions with latency, use for agentsim-controller test
// Mocks the simularium simulation back-end, w/ latency
export class DummyNetConnection extends NetConnection {
    private isStreamingData: boolean;
    private frameCounter: number;
    private isConnected: boolean;
    private commandLatencyMS: number;
    private connectLatencyMS: number;
    private totalDuration: number;
    private timeStep: number;

    public constructor(opts) {
        super(opts);

        this.isStreamingData = false;
        this.isConnected = false;
        this.frameCounter = 0;

        this.commandLatencyMS = 200;
        this.connectLatencyMS = 1000;

        this.timeStep = 1;
        this.totalDuration = 100;

        setInterval(this.broadcast.bind(this), 200);
    }

    private broadcast() {
        if (!this.isStreamingData) {
            return;
        }

        if (this.frameCounter * this.timeStep >= this.totalDuration - 1) {
            this.isStreamingData = false; // finished
            return;
        }

        const bundleSize = 5;
        const msg = {
            msgType: this.msgTypes.ID_VIS_DATA_ARRIVE,
            bundleStart: this.frameCounter,
            bundleSize: bundleSize,
            bundleData: [] as object[],
        };

        const bundleData: object[] = [];
        for (let i = 0; i < bundleSize; i++) {
            // The below is a single agent that moves in a circle
            const data = {
                frameNumber: this.frameCounter,
                time: this.frameCounter * this.timeStep,
                data: [
                    1000,
                    43,
                    Math.cos(this.frameCounter),
                    Math.sin(this.frameCounter),
                    0,
                    0,
                    0,
                    4.5,
                    1,
                    0,
                ],
            };

            bundleData.push(data);

            this.frameCounter++;
        }

        msg.bundleData = bundleData;
        this.onMessage({ data: JSON.stringify(msg) });
    }

    public getIp() {
        return "dummy-net-connection-test-addr";
    }

    public socketIsValid() {
        return this.isConnected;
    }

    public connectToRemoteServer(uri: string) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.isConnected = true;
                resolve(uri);
            }, this.connectLatencyMS);
        });
    }

    public disconnect() {
        setTimeout(() => {
            this.isConnected = false;
        }, this.commandLatencyMS);
    }

    public pauseRemoteSim() {
        this.isStreamingData = false;
    }
    public resumeRemoteSim() {
        this.isStreamingData = true;
    }
    public abortRemoteSim() {
        this.isStreamingData = false;
        this.isConnected = false;
    }

    public startRemoteTrajectoryPlayback(fileName: string) {
        return this.connectToRemoteServer(this.getIp()).then(() => {
            this.isStreamingData = true;
        });
    }

    public requestTrajectoryFileInfo(fileName: string) {
        setTimeout(() => {
            const tfi = {
                msgType: this.msgTypes.ID_TRAJECTORY_FILE_INFO,
                boxSizeX: 100,
                boxSizeY: 100,
                boxSizeZ: 10,
                totalDuration: this.totalDuration,
                timeStepSize: this.timeStep,
            };

            this.onMessage({ data: JSON.stringify(tfi) });
        }, this.commandLatencyMS);
    }

    public requestSingleFrame(frameNumber: number) {
        setTimeout(() => {
            // OnMessage event.data w/ parsable vis data message
        }, this.commandLatencyMS);
    }

    public gotoRemoteSimulationTime(timeNS: number) {
        setTimeout(() => {
            this.frameCounter = timeNS / this.timeStep;
        }, this.commandLatencyMS);
    }
    // TODO go through AgentSimController, implement mock functions for netConnection functionality used
}
