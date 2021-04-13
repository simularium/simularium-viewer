//import jsLogger from "js-logger";
//import { ILogger } from "js-logger";

import { VisDataMessage, TrajectoryFileInfoV2 } from "./types";

export interface ISimulator {
    // common to all ISimulators?
    //protected logger: ILogger;

    onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    onTrajectoryDataArrive: (msg: VisDataMessage) => void;

    socketIsValid(): boolean;

    /**
     * Connect
     * */
    connectToUri(uri: string): void;

    disconnect(): void;

    getIp(): string;

    connectToRemoteServer(address: string): Promise<string>;

    sendTimeStepUpdate(newTimeStep: number): void;

    sendParameterUpdate(paramName: string, paramValue: number): void;

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

    gotoRemoteSimulationTime(timeNanoSeconds: number): void;

    requestTrajectoryFileInfo(fileName: string): void;
}
