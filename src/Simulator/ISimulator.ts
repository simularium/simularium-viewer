import {
    VisDataMessage,
    TrajectoryFileInfo,
    PlotConfig,
    Plot,
    Metrics,
} from "../simularium/types.js";

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

    /** a callback to notify when TrajectoryFileInfo is ready */
    setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfo) => void
    ): void;

    /** a callback to notify when VisDataMessage is ready (the agent data) */
    setTrajectoryDataHandler(
        handler: (msg: VisDataMessage | ArrayBuffer) => void
    ): void;

    /** a callback to receive available metrics */
    setMetricsHandler(handler: (msg: Metrics) => void): void;

    /** a callback to receive plot data */
    setPlotDataHandler(handler: (msg: Plot[]) => void): void;

    /** a callback to propagate errors from a simulator to it's implementing context */
    setErrorHandler(handler: (msg: Error) => void): void;

    /** general update function for client simulators
     * todo: could also be implemented for control of live
     * and pre-run remote simulations
     * */
    sendUpdate(data: Record<string, unknown>): Promise<void>;

    // General simulation streaming control
    /** prepare a simulation for streaming, async to accommodate connection steps */
    initialize(fileName: string): Promise<void>;
    /** stop sending frames, release resources, close connections */
    abort(): void;
    /** request a stream of frames to begin */
    stream(): void;
    /** request that streaming of frames stop */
    pause(): void;
    /** request a single frame of data by frame number */
    requestFrame(frameNumber: number): void;
    /** request a single frame of data by time stamp */
    requestFrameByTime(time: number): void;
    /** request trajectory metadata */
    requestTrajectoryFileInfo(fileName: string): void;
    /** request available metrics */
    requestAvailableMetrics(): void;
    /** request available plots */
    requestPlotData(plots: PlotConfig[]): void;
}
