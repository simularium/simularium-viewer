import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import {
    VisDataFrame,
    VisDataMessage,
    TrajectoryFileInfoV2,
} from "../types.js";
import { ISimulator } from "./ISimulator.js";
import type { ISimulariumFile } from "../ISimulariumFile.js";
import { LocalFileSimulatorParams } from "./types.js";

// a LocalFileSimulator is a ISimulator that plays back the contents of
// a drag-n-drop trajectory file (a ISimulariumFile object)
export class LocalFileSimulator implements ISimulator {
    protected fileName: string;
    protected simulariumFile: ISimulariumFile;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage | ArrayBuffer) => void;
    public handleError: (error: Error) => void;
    // setInterval is the playback engine for now
    private playbackIntervalId = 0;
    private currentPlaybackFrameIndex = 0;

    public constructor(params: LocalFileSimulatorParams) {
        const { fileName, simulariumFile } = params;
        if (!simulariumFile) {
            throw new Error("LocalFileSimulator requires a ISimulariumFile");
        }
        if (!fileName) {
            throw new Error("LocalFileSimulator requires a fileName");
        }
        this.fileName = fileName;
        this.simulariumFile = simulariumFile;
        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);
        this.onTrajectoryFileInfoArrive = () => {
            /* do nothing */
        };
        this.onTrajectoryDataArrive = () => {
            /* do nothing */
        };
        this.handleError = () => {
            /* do nothing */
        };
        console.log("NEW LOCALFILECONNECTION");
    }

    public setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfoV2) => void
    ): void {
        this.onTrajectoryFileInfoArrive = handler;
    }
    public setTrajectoryDataHandler(
        handler: (msg: VisDataMessage | ArrayBuffer) => void
    ): void {
        this.onTrajectoryDataArrive = handler;
    }
    public setErrorHandler(handler: (msg: Error) => void): void {
        this.handleError = handler;
    }

    public initialize(_fileName: string): Promise<void> {
        try {
            const trajectoryInfo = this.simulariumFile.getTrajectoryFileInfo();
            this.onTrajectoryFileInfoArrive(trajectoryInfo);
        } catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve();
    }

    public pause(): void {
        window.clearInterval(this.playbackIntervalId);
        this.playbackIntervalId = 0;
    }

    public stream(): void {
        this.playbackIntervalId = window.setInterval(() => {
            const numFrames = this.simulariumFile.getNumFrames();
            if (this.currentPlaybackFrameIndex >= numFrames) {
                this.currentPlaybackFrameIndex = numFrames - 1;
                this.pause();
                return;
            }
            this.onTrajectoryDataArrive(
                this.getFrame(this.currentPlaybackFrameIndex)
            );
            this.currentPlaybackFrameIndex++;
        }, 1);
    }

    public abort(): void {
        window.clearInterval(this.playbackIntervalId);
        this.playbackIntervalId = 0;
        this.currentPlaybackFrameIndex = 0;
    }

    public requestFrame(startFrameNumber: number): void {
        this.onTrajectoryDataArrive(this.getFrame(startFrameNumber));
    }

    public requestFrameByTime(time: number): void {
        const frameNumber = this.simulariumFile.getFrameIndexAtTime(time);

        // frameNumber is -1 if findIndex() above doesn't find a match
        if (frameNumber !== -1) {
            this.currentPlaybackFrameIndex = frameNumber;
            this.requestFrame(frameNumber);
        }
    }

    public requestTrajectoryFileInfo(_fileName: string): void {
        this.onTrajectoryFileInfoArrive(
            this.simulariumFile.getTrajectoryFileInfo()
        );
    }

    public sendUpdate(_obj: Record<string, unknown>): Promise<void> {
        // not implemented
        return Promise.resolve();
    }

    private getFrame(theFrameNumber: number): VisDataMessage | ArrayBuffer {
        // Possible TODO:
        // Theoretically we could return all frames here, and as a result
        // the Controller would precache the entire file in VisData.
        // Then subsequent frame requests would only hit the VisData cache.

        const data = this.simulariumFile.getFrame(theFrameNumber);
        if (data instanceof ArrayBuffer) {
            return data as ArrayBuffer;
        } else {
            return {
                msgType: 0,
                bundleStart: theFrameNumber,
                bundleSize: 1,
                bundleData: [data as VisDataFrame],
                fileName: this.fileName,
            };
        }
    }

    public getSimulariumFile(): ISimulariumFile {
        return this.simulariumFile;
    }
}
