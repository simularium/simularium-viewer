import { ILogger } from "js-logger";
import { FrontEndError } from "./FrontEndError";
import { WebsocketClient, MessageEventLike, NetMessage } from "./WebsocketClient";
import { ISimulator } from "./ISimulator";
import { TrajectoryFileInfoV2, VisDataMessage } from "./types";
import { TrajectoryType } from "../constants";
export declare class RemoteSimulator implements ISimulator {
    webSocketClient: WebsocketClient;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (NetMessage: any) => void;
    onTrajectoryDataArrive: (NetMessage: any) => void;
    protected lastRequestedFile: string;
    handleError: (error: FrontEndError) => void | (() => void);
    protected useOctopus: boolean;
    constructor(webSocketClient: WebsocketClient, useOctopus: boolean, errorHandler?: (error: FrontEndError) => void);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfoV2) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;
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
    private registerBinaryMessageHandlers;
    private registerJsonMessageHandlers;
    /**
     * WebSocket Connect
     * */
    disconnect(): void;
    getIp(): string;
    connectToRemoteServer(): Promise<string>;
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
    convertTrajectory(dataToConvert: Record<string, unknown>, fileType: TrajectoryType): Promise<void>;
    sendTrajectory(dataToConvert: Record<string, unknown>, fileType: TrajectoryType): void;
}
