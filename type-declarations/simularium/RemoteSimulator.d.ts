import { ILogger } from "js-logger";
import { FrontEndError } from "./FrontEndError.js";
import { WebsocketClient, MessageEventLike } from "./WebsocketClient.js";
import type { NetMessage, ErrorMessage } from "./WebsocketClient.js";
import { ISimulator } from "./ISimulator.js";
import { TrajectoryFileInfoV2, VisDataMessage } from "./types.js";
export declare class RemoteSimulator implements ISimulator {
    webSocketClient: WebsocketClient;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (NetMessage: any) => void;
    onTrajectoryDataArrive: (NetMessage: any) => void;
    lastRequestedFile: string;
    handleError: (error: FrontEndError) => void | (() => void);
    constructor(webSocketClient: WebsocketClient, errorHandler?: (error: FrontEndError) => void);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfoV2) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;
    setErrorHandler(handler: (msg: Error) => void): void;
    socketIsValid(): boolean;
    getLastRequestedFile(): string;
    /**
     *   Websocket Message Handlers
     * */
    onBinaryIdVisDataArrive(event: MessageEventLike): void;
    onHeartbeatPing(msg: NetMessage): void;
    onJsonIdVisDataArrive(msg: NetMessage): void;
    updateTimestep(): void;
    updateRateParam(): void;
    onModelDefinitionArrive(): void;
    onErrorMsg(msg: ErrorMessage): void;
    private registerBinaryMessageHandlers;
    private registerJsonMessageHandlers;
    /**
     * WebSocket Connect
     * */
    disconnect(): void;
    getIp(): string;
    isConnectedToRemoteServer(): boolean;
    connectToRemoteServer(): Promise<string>;
    /**
     * Websocket Update Parameters
     */
    sendTimeStepUpdate(newTimeStep: number): void;
    sendParameterUpdate(paramName: string, paramValue: number): void;
    /**
     * WebSocket Simulation Control
     */
    initialize(fileName: string): Promise<void>;
    pause(): void;
    stream(): void;
    abort(): void;
    requestFrame(startFrameNumber: number): void;
    requestFrameByTime(time: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
    sendUpdate(_obj: Record<string, unknown>): Promise<void>;
}
