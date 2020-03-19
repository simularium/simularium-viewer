import { NetConnection } from "../";
export declare class DummyNetConnection extends NetConnection {
    private isStreamingData;
    private frameCounter;
    private isConnected;
    commandLatencyMS: number;
    connectLatencyMS: number;
    totalDuration: number;
    timeStep: number;
    constructor(opts: any);
    private getDataBundle;
    private broadcast;
    getIp(): string;
    socketIsValid(): boolean;
    connectToRemoteServer(uri: string): Promise<any>;
    disconnect(): void;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    requestTrajectoryFileInfo(fileName: string): void;
    requestSingleFrame(frameNumber: number): void;
    gotoRemoteSimulationTime(timeNS: number): void;
}
