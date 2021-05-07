import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import {
    VisDataMessage,
    VisDataFrame,
    TrajectoryFileInfoV2,
    SimulariumFileFormat,
} from "./types";
import { ISimulator } from "./ISimulator";

export class LocalFileSimulator implements ISimulator {
    protected fileName: string;
    protected simulariumFile: SimulariumFileFormat;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage) => void;
    // setInterval is the playback engine for now
    private playbackIntervalId = 0;
    private currentPlaybackFrameIndex = 0;

    public constructor(fileName: string, simulariumFile: SimulariumFileFormat) {
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
        handler: (msg: VisDataMessage) => void
    ): void {
        this.onTrajectoryDataArrive = handler;
    }

    public socketIsValid(): boolean {
        return true;
    }

    /**
     * Connect
     * */
    public connectToUri(_uri: string): void {
        // not implemented
    }

    public disconnect(): void {
        this.abortRemoteSim();
    }

    public getIp(): string {
        return "";
    }

    public connectToRemoteServer(_address: string): Promise<string> {
        return Promise.resolve("Local file successfully started");
    }

    public sendTimeStepUpdate(_newTimeStep: number): void {
        // not implemented
    }

    public sendParameterUpdate(_paramName: string, _paramValue: number): void {
        // not implemented
    }

    public sendModelDefinition(_model: string): void {
        // not implemented
    }

    /**
     * Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    public startRemoteSimPreRun(
        _timeStep: number,
        _numTimeSteps: number
    ): void {
        // not implemented
    }

    public startRemoteSimLive(): void {
        // not implemented
    }

    public startRemoteTrajectoryPlayback(_fileName: string): Promise<void> {
        const { spatialData, trajectoryInfo } = this.simulariumFile;

        if (!spatialData) {
            const newError = new Error(
                "Simularium files need 'spatialData' array"
            );
            return Promise.reject(newError);
        }
        spatialData.bundleData.sort(
            (a: VisDataFrame, b: VisDataFrame): number =>
                a.frameNumber - b.frameNumber
        );
        try {
            this.onTrajectoryFileInfoArrive(trajectoryInfo);
        } catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve();
    }

    public pauseRemoteSim(): void {
        window.clearInterval(this.playbackIntervalId);
        this.playbackIntervalId = 0;
    }

    public resumeRemoteSim(): void {
        this.playbackIntervalId = window.setInterval(() => {
            if (
                this.currentPlaybackFrameIndex >=
                this.simulariumFile.spatialData.bundleSize
            ) {
                this.currentPlaybackFrameIndex =
                    this.simulariumFile.spatialData.bundleSize - 1;
                this.pauseRemoteSim();
                return;
            }
            this.onTrajectoryDataArrive(
                this.getFrame(this.currentPlaybackFrameIndex)
            );
            this.currentPlaybackFrameIndex++;
        }, 1);
    }

    public abortRemoteSim(): void {
        window.clearInterval(this.playbackIntervalId);
        this.playbackIntervalId = 0;
        this.currentPlaybackFrameIndex = 0;
    }

    public requestSingleFrame(startFrameNumber: number): void {
        this.onTrajectoryDataArrive(this.getFrame(startFrameNumber));
    }

    public gotoRemoteSimulationTime(timeNanoSeconds: number): void {
        for (
            let frame = 0,
                numFrames = this.simulariumFile.spatialData.bundleData.length;
            frame < numFrames;
            frame++
        ) {
            const frameTime = this.simulariumFile.spatialData.bundleData[frame]
                .time;
            if (timeNanoSeconds < frameTime) {
                const theFrameNumber = Math.max(frame - 1, 0);

                this.onTrajectoryDataArrive(this.getFrame(theFrameNumber));
            }
        }
    }

    public requestTrajectoryFileInfo(_fileName: string): void {
        this.onTrajectoryFileInfoArrive(this.simulariumFile.trajectoryInfo);
    }

    private getFrame(theFrameNumber: number): VisDataMessage {
        //        return this.getAllFrames();
        return {
            msgType: 0,
            bundleStart: theFrameNumber,
            bundleSize: 1,
            bundleData: [
                this.simulariumFile.spatialData.bundleData[theFrameNumber],
            ],
            fileName: this.fileName,
        };
    }

    private getAllFrames(): VisDataMessage {
        return this.simulariumFile.spatialData;
    }
}
