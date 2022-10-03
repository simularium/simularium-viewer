import { ILogger } from "js-logger/src/types";
interface MessageEventLike {
    data: string;
}
export declare const enum NetMessageEnum {
    ID_UNDEFINED_WEB_REQUEST = 0,
    ID_VIS_DATA_ARRIVE = 1,
    ID_VIS_DATA_REQUEST = 2,
    ID_VIS_DATA_FINISH = 3,
    ID_VIS_DATA_PAUSE = 4,
    ID_VIS_DATA_RESUME = 5,
    ID_VIS_DATA_ABORT = 6,
    ID_UPDATE_TIME_STEP = 7,
    ID_UPDATE_RATE_PARAM = 8,
    ID_MODEL_DEFINITION = 9,
    ID_HEARTBEAT_PING = 10,
    ID_HEARTBEAT_PONG = 11,
    ID_PLAY_CACHE = 12,
    ID_TRAJECTORY_FILE_INFO = 13,
    ID_GOTO_SIMULATION_TIME = 14,
    ID_INIT_TRAJECTORY_FILE = 15,
    LENGTH = 16
}
export interface NetConnectionParams {
    serverIp?: string;
    serverPort?: number;
}
export declare class NetConnection {
    private webSocket;
    private serverIp;
    private serverPort;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (NetMessage: any) => void;
    onTrajectoryDataArrive: (NetMessage: any) => void;
    protected lastRequestedFile: string;
    constructor(opts?: NetConnectionParams);
    /**
     * WebSocket State
     */
    private socketIsConnecting;
    socketIsValid(): boolean;
    private socketIsConnected;
    /**
     *   Websocket Message Handler
     * */
    protected onMessage(event: MessageEvent | MessageEventLike): void;
    private onOpen;
    private onClose;
    /**
     * WebSocket Connect
     * */
    connectToUri(uri: string): void;
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
    sendTimeStepUpdate(newTimeStep: number): void;
    sendParameterUpdate(paramName: string, paramValue: number): void;
    sendModelDefinition(model: string): void;
    /**
     * WebSocket Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    startRemoteSimPreRun(timeStep: number, numTimeSteps: number): void;
    startRemoteSimLive(): void;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    playRemoteSimCacheFromFrame(cacheFrame: number): void;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: number): void;
    playRemoteSimCacheFromTime(timeNanoSeconds: number): void;
    gotoRemoteSimulationTime(timeNanoSeconds: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
}
export {};
