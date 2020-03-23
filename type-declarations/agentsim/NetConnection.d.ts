import { ILogger } from "js-logger/src/types";
interface NetMessageType {
    ID_UNDEFINED_WEB_REQUEST: number;
    ID_VIS_DATA_ARRIVE: number;
    ID_VIS_DATA_REQUEST: number;
    ID_VIS_DATA_FINISH: number;
    ID_VIS_DATA_PAUSE: number;
    ID_VIS_DATA_RESUME: number;
    ID_VIS_DATA_ABORT: number;
    ID_UPDATE_TIME_STEP: number;
    ID_UPDATE_RATE_PARAM: number;
    ID_MODEL_DEFINITION: number;
    ID_HEARTBEAT_PING: number;
    ID_HEARTBEAT_PONG: number;
    ID_PLAY_CACHE: number;
    ID_TRAJECTORY_FILE_INFO: number;
    ID_GOTO_SIMULATION_TIME: number;
    ID_INIT_TRAJECTORY_FILE: number;
}
interface PlayBackType {
    ID_LIVE_SIMULATION: number;
    ID_PRE_RUN_SIMULATION: number;
    ID_TRAJECTORY_FILE_PLAYBACK: number;
}
export declare class NetConnection {
    private webSocket;
    private serverIp;
    private serverPort;
    protected playbackTypes: PlayBackType;
    protected logger: ILogger;
    protected msgTypes: NetMessageType;
    onTrajectoryFileInfoArrive: Function;
    onTrajectoryDataArrive: Function;
    constructor(opts: any);
    /**
     * WebSocket State
     */
    private socketIsConnecting;
    socketIsValid(): boolean;
    private socketIsConnected;
    /**
     *   Websocket Message Handler
     * */
    protected onMessage(event: any): void;
    private onOpen;
    private onClose;
    /**
     * WebSocket Connect
     * */
    connectToUri(uri: any): void;
    disconnect(): void;
    getIp(): string;
    private connectToUriAsync;
    connectToRemoteServer(address: string): Promise<string>;
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
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    playRemoteSimCacheFromFrame(cacheFrame: any): void;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: number): void;
    playRemoteSimCacheFromTime(timeNanoSeconds: any): void;
    gotoRemoteSimulationTime(timeNanoSeconds: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
}
export {};
