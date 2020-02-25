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
        this.totalDuration = 99;

        setInterval(this.broadcast.bind(this), 200);
    }

    private getDataBundle(frameNumber: number, bundleSize: number) {
        const msg = {
            msgType: this.msgTypes.ID_VIS_DATA_ARRIVE,
            bundleStart: frameNumber,
            bundleSize: bundleSize,
            bundleData: [] as object[],
        };

        const bundleData: object[] = [];
        for (let i = 0; i < bundleSize; i++) {
            const data = {
                frameNumber: frameNumber,
                time: frameNumber * this.timeStep,
                data: [
                    1000,
                    43,
                    Math.cos(frameNumber / 4) * 5,
                    Math.sin(frameNumber / 4) * 5,
                    0,
                    0,
                    0,
                    10,
                    1,
                    0,
                ],
            };
            bundleData.push(data);
            frameNumber++;
        }

        msg.bundleData = bundleData;
        return msg;
    }

    private broadcast() {
        if (!this.isStreamingData) {
            return;
        }

        if (this.frameCounter * this.timeStep > this.totalDuration) {
            this.isStreamingData = false; // finished
            return;
        }

        const bundleSize = 5;
        const msg = this.getDataBundle(this.frameCounter, bundleSize);
        this.frameCounter += bundleSize;
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
                boxSizeZ: 20,
                totalDuration: this.totalDuration,
                timeStepSize: this.timeStep,
            };

            this.onMessage({ data: JSON.stringify(tfi) });
        }, this.commandLatencyMS);
    }

    public requestSingleFrame(frameNumber: number) {
        setTimeout(() => {
            this.frameCounter = frameNumber;

            const msg = this.getDataBundle(this.frameCounter, 1);
            this.frameCounter;
            this.onMessage({ data: JSON.stringify(msg) });
        }, this.commandLatencyMS);
    }

    public gotoRemoteSimulationTime(timeNS: number) {
        setTimeout(() => {
            this.frameCounter = timeNS / this.timeStep;

            const msg = this.getDataBundle(this.frameCounter, 1);
            this.frameCounter++;
            this.onMessage({ data: JSON.stringify(msg) });
        }, this.commandLatencyMS);
    }
    // TODO go through AgentSimController, implement mock functions for netConnection functionality used
}
