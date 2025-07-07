import { NetMessage, NetMessageEnum } from "../simularium/WebsocketClient.js";
import { RemoteSimulator } from "../Simulator/RemoteSimulator.js";
import { VisDataFrame, VisDataMessage } from "../simularium/types.js";
import { FrontEndError } from "../simularium/FrontEndError.js";
import { RemoteSimulatorParams } from "../Simulator/types.js";

// Mocks the simularium simulation back-end, w/ latency
export class DummyRemoteSimulator extends RemoteSimulator {
    private isStreamingData: boolean;
    private frameCounter: number;
    private isConnected: boolean;
    public commandLatencyMS: number;
    public connectLatencyMS: number;
    public totalDuration: number;
    public timeStep: number;

    public constructor(
        params: RemoteSimulatorParams,
        errorHandler?: (error: FrontEndError) => void
    ) {
        super(params, errorHandler);
        this.isStreamingData = false;
        this.isConnected = false;
        this.frameCounter = 0;

        this.commandLatencyMS = 200;
        this.connectLatencyMS = 1000;

        this.timeStep = 1;
        this.totalDuration = 99;
        this.lastRequestedFile = params.fileName;

        setInterval(this.broadcast.bind(this), 200);
    }

    private getDataBundle(frameNumber: number): string {
        const msg: VisDataMessage = {
            msgType: NetMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: frameNumber,
            bundleSize: 1, // backend only sends one frame at a time now
            bundleData: [],
            fileName: this.lastRequestedFile,
        };
        const data: VisDataFrame = {
            frameNumber: frameNumber,
            time: frameNumber,
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
        msg.bundleData.push(data);
        return JSON.stringify(msg);
    }

    private broadcast(): void {
        if (!this.isStreamingData) {
            return;
        }

        if (this.frameCounter * this.timeStep > this.totalDuration) {
            this.isStreamingData = false; // finished
            return;
        }

        const msg: NetMessage = JSON.parse(
            this.getDataBundle(this.frameCounter)
        );
        this.frameCounter++;
        this.onJsonIdVisDataArrive(msg);
    }

    public getIp(): string {
        return "dummy-net-connection-test-addr";
    }

    public socketIsValid(): boolean {
        return this.isConnected;
    }

    public disconnect(): void {
        setTimeout(() => {
            this.isConnected = false;
        }, this.commandLatencyMS);
    }

    public pause(): void {
        this.isStreamingData = false;
    }
    public stream(): void {
        this.isStreamingData = true;
    }
    public abort(): void {
        this.isStreamingData = false;
        this.isConnected = false;
    }

    public isConnectedToRemoteServer(): boolean {
        return true;
    }

    public initialize(fileName: string): Promise<void> {
        this.isConnected = true;
        this.isStreamingData = false;
        this.lastRequestedFile = fileName;
        return Promise.resolve();
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

            this.onTrajectoryFileInfoArrive({ data: JSON.stringify(tfi) });

            // Send the first frame of data
            const msg: NetMessage = JSON.parse(this.getDataBundle(0));
            this.frameCounter++;
            this.onJsonIdVisDataArrive(msg);
        }, this.commandLatencyMS);
    }

    public requestFrame(frameNumber: number): void {
        setTimeout(() => {
            this.frameCounter = frameNumber;

            const msg: NetMessage = JSON.parse(this.getDataBundle(frameNumber));
            this.frameCounter++;
            this.onJsonIdVisDataArrive(msg);
        }, this.commandLatencyMS);
    }

    public requestFrameByTime(time: number): void {
        setTimeout(() => {
            this.frameCounter = time / this.timeStep;

            const msg: NetMessage = JSON.parse(
                this.getDataBundle(this.frameCounter)
            );
            this.frameCounter++;
            this.onJsonIdVisDataArrive(msg);
        }, this.commandLatencyMS);
    }
}
