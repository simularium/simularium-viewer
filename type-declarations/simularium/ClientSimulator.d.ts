import { ILogger } from "js-logger";
import { VisDataMessage, TrajectoryFileInfo } from "./types";
import { IClientSimulatorImpl } from "./localSimulators/IClientSimulatorImpl";
import { ISimulator } from "./ISimulator";
export declare class ClientSimulator implements ISimulator {
    private localSimulator;
    private simulatorIntervalId;
    private dataInterval;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfo) => void;
    onTrajectoryDataArrive: (msg: VisDataMessage) => void;
    constructor(sim: IClientSimulatorImpl);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfo) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;
    socketIsValid(): boolean;
    /**
     * Connect
     * */
    disconnect(): void;
    getIp(): string;
    isConnectedToRemoteServer(): boolean;
    connectToRemoteServer(_address: string): Promise<string>;
    private sendSimulationRequest;
    sendTimeStepUpdate(newTimeStep: number): void;
    sendUpdate(obj: Record<string, unknown>): void;
    sendModelDefinition(model: string): void;
    /**
     * Simulation Control
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
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: number): void;
    gotoRemoteSimulationTime(time: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
}
