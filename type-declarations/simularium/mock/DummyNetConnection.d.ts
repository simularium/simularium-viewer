import { NetConnection } from "../";
import { NetConnectionParams } from "../NetConnection";
export declare class DummyNetConnection extends NetConnection {
    private isStreamingData;
    private frameCounter;
    private isConnected;
    commandLatencyMS: number;
    connectLatencyMS: number;
    totalDuration: number;
    timeStep: number;
    private fileName;
    constructor(opts: NetConnectionParams);
    private getDataBundle;
    private broadcast;
    getIp(): string;
    socketIsValid(): boolean;
    connectToRemoteServer(uri: string): Promise<string>;
    disconnect(): void;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    requestTrajectoryFileInfo(fileName: string): void;
    requestSingleFrame(frameNumber: number): void;
    gotoRemoteSimulationTime(timeNS: number): void;
}
