import { NetConnection } from '../';
export declare class DummyNetConnection extends NetConnection {
    private isStreamingData;
    private frameCounter;
    private isConnected;
    private commandLatencyMS;
    private connectLatencyMS;
    private totalDuration;
    private timeStep;
    constructor(opts: any);
    private broadcast;
    getIp(): string;
    socketIsValid(): boolean;
    connectToRemoteServer(uri: string): Promise<{}>;
    disconnect(): void;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    requestTrajectoryFileInfo(fileName: string): void;
    requestSingleFrame(frameNumber: number): void;
    gotoRemoteSimulationTime(timeNS: number): void;
}
