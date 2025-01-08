import { VisDataMessage, TrajectoryFileInfo } from "./types.js";

/**
From the caller's perspective, this interface is a contract for a 
simulator that can be used to control set up, tear down, and streaming,
and to subscribe to data events and error handling.
 */

export interface ISimulator {
    /**
     * Callbacks to subscribe front end implementations
     * to data events and error handling from the simulator
     */

    // a callback to notify when TrajectoryFileInfo is ready
    setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfo) => void
    ): void;

    // a callback to notify when VisDataMessage is ready (the agent data)
    setTrajectoryDataHandler(
        handler: (msg: VisDataMessage | ArrayBuffer) => void
    ): void;

    setErrorHandler(handler: (msg: Error) => void): void;

    // general update function for client simulators
    // todo: could also be implemented for control of live
    // and pre-run remote simulations
    sendUpdate(data: Record<string, unknown>): Promise<void>;

    /**
     * General Simulation Control
     *
     * initialize: prepare a simulation for streaming, async to accommodate connection steps
     * destroy: stop sending frames, release resources, close connections
     * stream: request a stream of frames
     * pause: request that frames stop being sent, keep the precomputed streaming head where it is
     *
     */
    initialize(fileName: string): Promise<void>;
    destroy(): void;
    stream(): void;
    pause(): void;
    requestSingleFrame(startFrameNumber: number): void;
    requestFrameByTime(time: number): void;
    requestTrajectoryFileInfo(fileName: string): void;
}
