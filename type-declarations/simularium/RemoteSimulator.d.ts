import { ILogger } from "js-logger";
import { FrontEndError } from "./FrontEndError";
import { WebsocketClient, MessageEventLike } from "./WebsocketClient";
import type { NetMessage, ErrorMessage } from "./WebsocketClient";
import { ISimulator } from "./ISimulator";
import { TrajectoryFileInfoV2, VisDataMessage } from "./types";
import { TrajectoryType } from "../constants";
export declare class RemoteSimulator implements ISimulator {
    webSocketClient: WebsocketClient;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (NetMessage: any) => void;
    onTrajectoryDataArrive: (NetMessage: any) => void;
    healthCheckHandler: () => void;
    protected lastRequestedFile: string;
    handleError: (error: FrontEndError) => void | (() => void);
    constructor(webSocketClient: WebsocketClient, errorHandler?: (error: FrontEndError) => void);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfoV2) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;
    setHealthCheckHandler(handler: () => void): void;
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
    sendModelDefinition(model: string): void;
    /**
     * WebSocket Simulation Control
     */
    startRemoteSimPreRun(_timeStep: number, _numTimeSteps: number): void;
    startRemoteSimLive(): void;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: number): void;
    gotoRemoteSimulationTime(time: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
    sendUpdate(obj: Record<string, unknown>): void;
    convertTrajectory(dataToConvert: Record<string, unknown>, fileType: TrajectoryType, providedFileName?: string): Promise<void>;
    sendTrajectory(dataToConvert: Record<string, unknown>, fileType: TrajectoryType, providedFileName?: string): void;
    checkServerHealth(): Promise<void>;
    cancelConversion(): void;
}
