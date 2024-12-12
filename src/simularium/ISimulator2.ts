import { VisDataMessage, TrajectoryFileInfo } from "./types";

/**
From the caller's perspective, this interface is a contract for a 
simulator that can be used to:
load a local file with a LocalFileSimulator
run a procedural simulation in the browser with a ClientSimulator
connect to a remote server with a RemoteSimulator in order to
receive a stream of precomputed or live simulation data
confiugure a pre-run simulation
configure a live simulation
 */

export interface ISimulatorLiveAndPreRunConfig {
    /**
     * Live/pre-run simulation configuration.
     * These methods are not meaningfully implemented yet,
     * Notably the BioSimulators prototpye using a unique msg type
     * but does not call startRemoteSimPreRun or startRemoteSimLive
     */
    // a general update function for live/pre-run simulation parameters,
    sendUpdate(data: Record<string, unknown>): void;
    // a request for a bounded run of a simulation, not implemented
    startRemoteSimPreRun(timeStep: number, numTimeSteps: number): void;
    // request for an indefinite simulation run, not implemented
    startRemoteSimLive(): void;
    // not sure what this does, not implemented
    sendModelDefinition(model: string): void;
}

export interface ISimulatorRemoteConnectionConfig {
    connectToRemoteServer(address: string): Promise<string>;
    socketIsValid(): boolean;
    isConnectedToRemoteServer(): boolean;
    getIp(): string;
    disconnect(): void;
    liveAndPreRunConfig?: ISimulatorLiveAndPreRunConfig;
}

export interface ISimulator2 {
    /**
     * This callback runs when the trajectory file info is ready.
     * Provides: version, metadata, timestep/# of steps, model info, units, etc.
     */
    setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfo) => void
    ): void;

    /**
     * Callback for when a frame of data is ready.
     */
    setTrajectoryDataHandler(
        handler: (msg: VisDataMessage | ArrayBuffer) => void
    ): void;

    /**
     * General Simulation Control
     *
     * initialize: tell Octopus what file we are requesting, or tell client sim to call getInfo on localSimulator
     * stream: request that a stream begin from the streaming head, these frames are played immediately or cached
     * pause: stop sending frames, keep the precomputed streaming head where it is, pause live/client sims that are running
     * abort: stop sending frames, tell Octopus we are done with this file, tell live/client to end running sims
     * requestFirstFrame: after initialization, request the first frame without starting playback
     * requestDataByTime / requestDataByFrame: ask the backend for a particular frame, and move the streaming head
     *
     */

    initialize(fileName: string): Promise<void>; // fka startRemoteTrajectoryPlayback and requestTrajectoryFileInfo
    stream(): void; // fka resumeRemoteSim(): void;
    pause(): void; // fka pauseRemoteSim(): void;
    abort(): void; // fka abortRemoteSim(): void;
    requestFirstFrame(startFrameNumber: number): void; // requestSingleFrame(startFrameNumber: number): void;to use only during initialization, as is our practice now
    requestDataByTime(time: number): void; // gotoRemoteSimulationTime(time: number): void;
    // requestDataByFrame(frame: number): void; // proposed, doesn't existm, as above but by frame, instead of requestSingleFrame which is implied to be part of initializing

    /**
     * only necessary for RemoteSimulators
     */
    connectionConfig?: ISimulatorRemoteConnectionConfig;
}
