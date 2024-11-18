import { VisDataMessage, TrajectoryFileInfo } from "./types";

// TODO we need to examine this whole interface and document it with comments here
// what is each function expected to do, from the caller's perspective?
// are they named appropriately?
// and are some of them completely specific to websockets only?
export interface ISimulator {
    // a callback to notify when TrajctoryFileInfo is ready
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfo) => void): void;

    // a callback to notify when VisDataMessage is ready (the agent data)
    setTrajectoryDataHandler(handler: (msg: VisDataMessage | ArrayBuffer) => void): void;

    /**
     * Connect
     * */
    connectToRemoteServer(address: string): Promise<string>;
    socketIsValid(): boolean;
    isConnectedToRemoteServer(): boolean;
    getIp(): string;
    disconnect(): void;

    // TODO Fold into sendUpdate
    sendTimeStepUpdate(newTimeStep: number): void;
    sendUpdate(data: Record<string, unknown>): void;

    /**
     * Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    // these should probably be abstracted to just "start"
    // and have a separate interface for initialization?
    // For example, "start" = initialize, and "resume" = play
    startRemoteSimPreRun(timeStep: number, numTimeSteps: number): void;
    startRemoteSimLive(): void;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    sendModelDefinition(model: string): void;

    requestTrajectoryFileInfo(fileName: string): void;

    pauseRemoteSim(): void;

    resumeRemoteSim(): void;

    abortRemoteSim(): void;

    requestSingleFrame(startFrameNumber: number): void;

    // what do these mean for live mode?? can go backward but not forward
    gotoRemoteSimulationTime(time: number): void;
}
