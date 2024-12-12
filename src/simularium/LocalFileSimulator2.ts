import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import { VisDataFrame, VisDataMessage, TrajectoryFileInfoV2 } from "./types.js";
import type { ISimulariumFile } from "./ISimulariumFile.js";
import { ISimulator2 } from "./ISimulator2.js";

// a LocalFileSimulator is a ISimulator that plays back the contents of
// a drag-n-drop trajectory file (a ISimulariumFile object)
export class LocalFileSimulator implements ISimulator2 {
    protected fileName: string;
    protected simulariumFile: ISimulariumFile;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage | ArrayBuffer) => void;
    // setInterval is the playback engine for now
    private playbackIntervalId = 0;
    private currentPlaybackFrameIndex = 0;

    public constructor(fileName: string, simulariumFile: ISimulariumFile) {
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

    // public socketIsValid(): boolean {
    //     return true;
    // }

    /**
     * Connect
     * */
    // public disconnect(): void {
    //     this.abortRemoteSim();
    // }

    // public getIp(): string {
    //     return "";
    // }

    // public isConnectedToRemoteServer(): boolean {
    //     return false;
    // }

    // public connectToRemoteServer(_address: string): Promise<string> {
    //     return Promise.resolve("Local file successfully started");
    // }

    // public sendTimeStepUpdate(_newTimeStep: number): void {
    //     // not implemented
    // }

    // public sendParameterUpdate(_paramName: string, _paramValue: number): void {
    //     // not implemented
    // }

    // public sendModelDefinition(_model: string): void {
    //     // not implemented
    // }

    /**
     * Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    // public startRemoteSimPreRun(
    //     _timeStep: number,
    //     _numTimeSteps: number
    // ): void {
    //     // not implemented
    // }

    // public startRemoteSimLive(): void {
    //     // not implemented
    // }

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

    public requestFirstFrame(startFrameNumber: number): void {
        this.onTrajectoryDataArrive(this.getFrame(startFrameNumber));
    }

    public requestDataByTime(time: number): void {
        const frameNumber = this.simulariumFile.getFrameIndexAtTime(time);

        // frameNumber is -1 if findIndex() above doesn't find a match
        if (frameNumber !== -1) {
            this.currentPlaybackFrameIndex = frameNumber;
            this.requestFirstFrame(frameNumber);
        }
    }

    // public requestTrajectoryFileInfo(_fileName: string): void {
    //     this.onTrajectoryFileInfoArrive(
    //         this.simulariumFile.getTrajectoryFileInfo()
    //     );
    // }

    // public sendUpdate(_obj: Record<string, unknown>): void {
    //     // not implemented
    // }

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
