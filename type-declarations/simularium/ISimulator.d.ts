import { VisDataMessage, TrajectoryFileInfo } from "./types";
export interface ISimulator {
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfo) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage | ArrayBuffer) => void): void;
    /**
     * Connect
     * */
    connectToRemoteServer(address: string): Promise<string>;
    socketIsValid(): boolean;
    isConnectedToRemoteServer(): boolean;
    getIp(): string;
    disconnect(): void;
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
    startRemoteSimPreRun(timeStep: number, numTimeSteps: number): void;
    startRemoteSimLive(): void;
    startRemoteTrajectoryPlayback(fileName: string): Promise<void>;
    sendModelDefinition(model: string): void;
    requestTrajectoryFileInfo(fileName: string): void;
    pauseRemoteSim(): void;
    resumeRemoteSim(): void;
    abortRemoteSim(): void;
    requestSingleFrame(startFrameNumber: number): void;
    gotoRemoteSimulationTime(time: number): void;
}
