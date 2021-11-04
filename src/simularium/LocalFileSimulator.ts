import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import { compareTimes } from "../util";

import {
    VisDataMessage,
    VisDataFrame,
    TrajectoryFileInfoV2,
    SimulariumFileFormat,
} from "./types";
import { ISimulator } from "./ISimulator";
import FrontEndError from "./FrontEndError";

// a LocalFileSimulator is a ISimulator that plays back the contents of
// a drag-n-drop trajectory file (a SimulariumFileFormat object)
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
            const newError = new FrontEndError(
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

    public gotoRemoteSimulationTime(time: number): void {
        const { bundleData } = this.simulariumFile.spatialData;
        const { timeStepSize } = this.simulariumFile.trajectoryInfo;

        // Find the index of the frame that has the time matching our target time
        const frameNumber = bundleData.findIndex((bundleData) => {
            return compareTimes(bundleData.time, time, timeStepSize) === 0;
        });

        // frameNumber is -1 if findIndex() above doesn't find a match
        if (frameNumber !== -1) {
            this.currentPlaybackFrameIndex = frameNumber;
            this.requestSingleFrame(frameNumber);
        }
    }

    public requestTrajectoryFileInfo(_fileName: string): void {
        this.onTrajectoryFileInfoArrive(this.simulariumFile.trajectoryInfo);
    }

    private getFrame(theFrameNumber: number): VisDataMessage {
        // thoretically we could return all frames here, and as a result the Controller would precache the entire file in VisData
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
