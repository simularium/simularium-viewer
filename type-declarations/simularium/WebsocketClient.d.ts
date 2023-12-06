import { ILogger } from "js-logger";
import { FrontEndError } from "./FrontEndError";
export interface NetMessage {
    connId: string;
    msgType: number;
    fileName: string;
}
export interface ErrorMessage extends NetMessage {
    errorCode: number;
    errorMsg: string;
}
interface SimulariumEvent {
    data: string;
}
export declare type MessageEventLike = SimulariumEvent | MessageEvent;
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
    ID_CONVERT_TRAJECTORY_FILE = 16,
    ID_AVAILABLE_METRICS_REQUEST = 17,
    ID_AVAILABLE_METRICS_RESPONSE = 18,
    ID_PLOT_DATA_REQUEST = 19,
    ID_PLOT_DATA_RESPONSE = 20,
    ID_ERROR_MSG = 21,
    ID_CHECK_HEALTH_REQUEST = 22,
    ID_SERVER_HEALTHY_RESPONSE = 23,
    LENGTH = 24
}
export declare const enum ServerErrorCodes {
    FILE_NOT_FOUND = 0,
    MALFORMED_MESSAGE = 1,
    MALFORMED_FILE = 2,
    AUTOCONVERSION_ERROR = 3,
    METRICS_CALC_ERROR = 4,
    FRAME_NOT_FOUND = 5,
    FILENAME_MISMATCH = 6,
    NO_RUNNING_SIMULATION = 7,
    LENGTH = 8
}
export declare const CONNECTION_SUCCESS_MSG = "Remote sim successfully started";
export declare const CONNECTION_FAIL_MSG = "Failed to connect to server; try reloading. If the problem persists, there may be a problem with your connection speed or the server might be too busy.";
export interface NetConnectionParams {
    serverIp?: string;
    serverPort?: number;
    secureConnection?: boolean;
    useOctopus?: boolean;
}
export declare class WebsocketClient {
    private webSocket;
    private serverIp;
    private serverPort;
    private secureConnection;
    connectionTimeWaited: number;
    connectionRetries: number;
    protected jsonMessageHandlers: Map<NetMessageEnum, (NetMessage: any) => void>;
    protected binaryMessageHandlers: Map<NetMessageEnum, (MessageEventLike: any) => void>;
    protected logger: ILogger;
    handleError: (error: FrontEndError) => void | (() => void);
    constructor(opts?: NetConnectionParams, errorHandler?: (error: FrontEndError) => void);
    /**
     * WebSocket State
     */
    private socketIsConnecting;
    socketIsValid(): boolean;
    private socketIsConnected;
    /**
     *   Websocket Message Handling
     * */
    addBinaryMessageHandler(messageType: NetMessageEnum, handler: (msg: MessageEventLike) => void): void;
    addJsonMessageHandler(messageType: NetMessageEnum, handler: (msg: NetMessage) => void): void;
    protected onMessage(event: MessageEventLike): void;
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
    connectToRemoteServer(): Promise<string>;
    /**
     * Websocket Send Helper Functions
     */
    private logWebSocketRequest;
    sendWebSocketRequest(jsonData: Record<string, unknown>, requestDescription: string): void;
}
export {};
