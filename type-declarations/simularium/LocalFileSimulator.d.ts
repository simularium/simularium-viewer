import { ILogger } from "js-logger";
import { VisDataMessage, TrajectoryFileInfoV2 } from "./types";
import { ISimulator } from "./ISimulator";
import type { ISimulariumFile } from "./ISimulariumFile";
export declare class LocalFileSimulator implements ISimulator {
    protected fileName: string;
    protected simulariumFile: ISimulariumFile;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    onTrajectoryDataArrive: (msg: VisDataMessage | ArrayBuffer) => void;
    private playbackIntervalId;
    private currentPlaybackFrameIndex;
    constructor(fileName: string, simulariumFile: ISimulariumFile);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfoV2) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage | ArrayBuffer) => void): void;
    socketIsValid(): boolean;
    /**
     * Connect
     * */
    disconnect(): void;
    getIp(): string;
    isConnectedToRemoteServer(): boolean;
    connectToRemoteServer(_address: string): Promise<string>;
    sendTimeStepUpdate(_newTimeStep: number): void;
    sendParameterUpdate(_paramName: string, _paramValue: number): void;
    sendModelDefinition(_model: string): void;
    /**
     * Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    startRemoteSimPreRun(_timeStep: number, _numTimeSteps: number): void;
    startRemoteSimLive(): void;
    startRemoteTrajectoryPlayback(_fileName: string): Promise<void>;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: number): void;
    gotoRemoteSimulationTime(time: number): void;
    requestTrajectoryFileInfo(_fileName: string): void;
    sendUpdate(_obj: Record<string, unknown>): void;
    private getFrame;
    getSimulariumFile(): ISimulariumFile;
}
