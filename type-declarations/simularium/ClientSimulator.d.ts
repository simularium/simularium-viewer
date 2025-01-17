import { ILogger } from "js-logger";
import { VisDataMessage, TrajectoryFileInfo } from "./types.js";
import { IClientSimulatorImpl } from "./localSimulators/IClientSimulatorImpl.js";
import { ISimulator } from "./ISimulator.js";
export declare class ClientSimulator implements ISimulator {
    private localSimulator;
    private simulatorIntervalId;
    private dataInterval;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfo) => void;
    onTrajectoryDataArrive: (msg: VisDataMessage) => void;
    handleError: (error: Error) => void;
    constructor(sim: IClientSimulatorImpl);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfo) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;
    setErrorHandler(handler: (msg: Error) => void): void;
    private sendSimulationRequest;
    sendTimeStepUpdate(newTimeStep: number): void;
    sendUpdate(obj: Record<string, unknown>): Promise<void>;
    /**
     * Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    initialize(fileName: string): Promise<void>;
    pause(): void;
    stream(): void;
    abort(): void;
    requestFrame(startFrameNumber: number): void;
    requestFrameByTime(time: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
}
