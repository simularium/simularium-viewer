import { RemoteSimulator } from "../";
import { NetConnectionParams, NetMessageEnum } from "../RemoteSimulator";

import { VisDataFrame, VisDataMessage } from "../types";

interface TestDataBundle {
    bundleSize: number;
    bundleStart: number;
}

// Mocks the simularium simulation back-end, w/ latency
export class DummyNetConnection extends RemoteSimulator {
    private isStreamingData: boolean;
    private frameCounter: number;
    private isConnected: boolean;
    public commandLatencyMS: number;
    public connectLatencyMS: number;
    public totalDuration: number;
    public timeStep: number;
    private fileName: string;

    public constructor(opts: NetConnectionParams) {
        super(opts);

        this.isStreamingData = false;
        this.isConnected = false;
        this.frameCounter = 0;

        this.commandLatencyMS = 200;
        this.connectLatencyMS = 1000;

        this.timeStep = 1;
        this.totalDuration = 99;
        this.fileName = "";

        setInterval(this.broadcast.bind(this), 200);
    }

    private getDataBundle(
        frameNumber: number,
        bundleSize: number
    ): TestDataBundle {
        const msg: VisDataMessage = {
            msgType: NetMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: frameNumber,
            bundleSize: bundleSize,
            bundleData: [],
            fileName: this.lastRequestedFile,
        };

        const bundleData: VisDataFrame[] = [];
        for (let i = 0; i < bundleSize; i++) {
            const data: VisDataFrame = {
                frameNumber: frameNumber,
                time: frameNumber * this.timeStep,
                data: [
                    1000,
                    0,
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

    private broadcast(): void {
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

    public getIp(): string {
        return "dummy-net-connection-test-addr";
    }

    public socketIsValid(): boolean {
        return this.isConnected;
    }

    public connectToRemoteServer(uri: string): Promise<string> {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isConnected = true;
                resolve(uri);
            }, this.connectLatencyMS);
        });
    }

    public disconnect(): void {
        setTimeout(() => {
            this.isConnected = false;
        }, this.commandLatencyMS);
    }

    public pauseRemoteSim(): void {
        this.isStreamingData = false;
    }
    public resumeRemoteSim(): void {
        this.isStreamingData = true;
    }
    public abortRemoteSim(): void {
        this.isStreamingData = false;
        this.isConnected = false;
    }

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
        return this.connectToRemoteServer(this.getIp()).then(() => {
            this.fileName = fileName;
            this.isStreamingData = true;
            this.lastRequestedFile = fileName;
        });
    }

    public requestTrajectoryFileInfo(fileName: string): void {
        setTimeout(() => {
            const tfi = {
                msgType: NetMessageEnum.ID_TRAJECTORY_FILE_INFO,
                boxSizeX: 100,
                boxSizeY: 100,
                boxSizeZ: 20,
                totalDuration: this.totalDuration,
                timeStepSize: this.timeStep,
                fileName: fileName,
            };

            this.onMessage({ data: JSON.stringify(tfi) });

            // Send the first frame of data
            const msg = this.getDataBundle(0, 1);
            this.frameCounter++;
            this.onMessage({ data: JSON.stringify(msg) });
        }, this.commandLatencyMS);
    }

    public requestSingleFrame(frameNumber: number): void {
        setTimeout(() => {
            this.frameCounter = frameNumber;

            const msg = this.getDataBundle(this.frameCounter, 1);
            this.frameCounter;
            this.onMessage({ data: JSON.stringify(msg) });
        }, this.commandLatencyMS);
    }

    public gotoRemoteSimulationTime(timeNS: number): void {
        setTimeout(() => {
            this.frameCounter = timeNS / this.timeStep;

            const msg = this.getDataBundle(this.frameCounter, 1);
            this.frameCounter++;
            this.onMessage({ data: JSON.stringify(msg) });
        }, this.commandLatencyMS);
    }
}
