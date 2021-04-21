//import jsLogger from "js-logger";
//import { ILogger } from "js-logger";

import { VisDataMessage, TrajectoryFileInfoV2 } from "./types";

// TODO we need to examine this whole interface and document it with comments here
// what is each function expected to do, from the caller's perspective?
// are they named appropriately?
// and are some of them completely specific to websockets only?
export interface ISimulator {
    // common to all ISimulators?
    //protected logger: ILogger;

    // what to do about these? they tend to be injected from the outside
    //onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    //onTrajectoryDataArrive: (msg: VisDataMessage) => void;
    setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfoV2) => void
    ): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;
    // others?

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
