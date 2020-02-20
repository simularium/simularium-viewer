export declare class NetConnection {
    private webSocket;
    private serverIp;
    private serverPort;
    private msgTypes;
    private playbackTypes;
    private logger;
    onTrajectoryFileInfoArrive: any;
    onTrajectoryDataArrive: any;
    constructor(opts: any, loggerLevel: any);
    /**
     * WebSocket State
     */
    private socketIsConnecting;
    socketIsValid(): boolean;
    private socketIsConnected;
    /**
     *   Websocket Message Handler
     * */
    private onMessage;
    private onOpen;
    private onClose;
    /**
     * WebSocket Connect
     * */
    connectToUri(uri: any): void;
    disconnect(): void;
    getIp(): string;
    private connectToUriAsync;
    connectToRemoteServer(address: any): Promise<{}>;
    /**
     * Websocket Send Helper Functions
     */
    private logWebSocketRequest;
    private sendWebSocketRequest;
    /**
     * Websocket Update Parameters
     */
    sendTimeStepUpdate(newTimeStep: any): void;
    sendParameterUpdate(paramName: any, paramValue: any): void;
    sendModelDefinition(model: any): void;
    /**
     * WebSocket Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    startRemoteSimPreRun(timeStep: any, numTimeSteps: any): void;
    startRemoteSimLive(): void;
    startRemoteTrajectoryPlayback(fileName: any): Promise<void> | undefined;
    playRemoteSimCacheFromFrame(cacheFrame: any): void;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: any): void;
    playRemoteSimCacheFromTime(timeNanoSeconds: any): void;
    gotoRemoteSimulationTime(timeNanoSeconds: any): void;
    requestTrajectoryFileInfo(fileName: any): void;
}
