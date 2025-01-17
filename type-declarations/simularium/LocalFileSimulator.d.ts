import { ILogger } from "js-logger";
import { VisDataMessage, TrajectoryFileInfoV2 } from "./types.js";
import { ISimulator } from "./ISimulator.js";
import type { ISimulariumFile } from "./ISimulariumFile.js";
export declare class LocalFileSimulator implements ISimulator {
    protected fileName: string;
    protected simulariumFile: ISimulariumFile;
    protected logger: ILogger;
    onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    onTrajectoryDataArrive: (msg: VisDataMessage | ArrayBuffer) => void;
    handleError: (error: Error) => void;
    private playbackIntervalId;
    private currentPlaybackFrameIndex;
    constructor(fileName: string, simulariumFile: ISimulariumFile);
    setTrajectoryFileInfoHandler(handler: (msg: TrajectoryFileInfoV2) => void): void;
    setTrajectoryDataHandler(handler: (msg: VisDataMessage | ArrayBuffer) => void): void;
    setErrorHandler(handler: (msg: Error) => void): void;
    initialize(_fileName: string): Promise<void>;
    pause(): void;
    stream(): void;
    abort(): void;
    requestFrame(startFrameNumber: number): void;
    requestFrameByTime(time: number): void;
    requestTrajectoryFileInfo(_fileName: string): void;
    sendUpdate(_obj: Record<string, unknown>): Promise<void>;
    private getFrame;
    getSimulariumFile(): ISimulariumFile;
}
