import { VisDataMessage, TrajectoryFileInfo } from "./types";

// TODO we need to examine this whole interface and document it with comments here
// what is each function expected to do, from the caller's perspective?
// are they named appropriately?
// and are some of them completely specific to websockets only?
export interface ISimulator {
    // a callback to notify when TrajctoryFileInfo is ready
    setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfo) => void
    ): void;

    // a callback to notify when VisDataMessage is ready (the agent data)
    setTrajectoryDataHandler(handler: (msg: VisDataMessage) => void): void;

    socketIsValid(): boolean;

    /**
     * Connect
     * */
    createWebSocket(uri: string): void;

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

    gotoRemoteSimulationTime(time: number): void;

    requestTrajectoryFileInfo(fileName: string): void;
}
