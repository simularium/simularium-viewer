import { ILogger } from "js-logger";
import { FrontEndError } from "./FrontEndError";
import { ISimulator } from "./ISimulator";
import { TrajectoryFileInfoV2, VisDataMessage } from "./types";
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
    ID_TRAJECTORY_FILE_INFO = 12,
    ID_GOTO_SIMULATION_TIME = 13,
    ID_INIT_TRAJECTORY_FILE = 14,
    ID_UPDATE_SIMULATION_STATE = 15,
    LENGTH = 16
}
export declare const CONNECTION_SUCCESS_MSG = "Remote sim successfully started";
export declare const CONNECTION_FAIL_MSG = "Failed to connect to server; try reloading. If the problem persists, there may be a problem with your connection speed or the server might be too busy.";
export interface NetConnectionParams {
    serverIp?: string;
    serverPort?: number;
}
export declare class RemoteSimulator implements ISimulator {
    private webSocket;
    private serverIp;
    private serverPort;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (NetMessage: any) => void;
    onTrajectoryDataArrive: (NetMessage: any) => void;
    protected lastRequestedFile: string;
    connectionTimeWaited: number;
    connectionRetries: number;
    handleError: (error: FrontEndError) => void | (() => void);
    constructor(opts?: NetConnectionParams, errorHandler?: (error: FrontEndError) => void);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfoV2) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;
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
    createWebSocket(uri: string): void;
    disconnect(): void;
    getIp(): string;
    waitForWebSocket(timeout: number): Promise<boolean>;
    checkConnection(address: string, timeout?: number, maxRetries?: number): Promise<boolean>;
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
    startRemoteSimPreRun(timeStep: number, numTimeSteps: number): Promise<void>;
    startRemoteSimLive(): Promise<void>;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: number): void;
    gotoRemoteSimulationTime(time: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
    sendUpdate(obj: Record<string, unknown>): void;
}
export {};
