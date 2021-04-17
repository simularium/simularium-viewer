import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import {
    VisDataMessage,
    VisDataFrame,
    TrajectoryFileInfoV2,
    SimulariumFileFormat,
} from "./types";
import { ISimulator } from "./ISimulator";
import VisData from "./VisData";

export class LocalFileConnection implements ISimulator {
    protected fileName: string;
    protected visData: VisData; // for cacheJSON
    protected simulariumFile: SimulariumFileFormat;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage) => void;
    // setInterval is the playback engine for now
    private playbackIntervalId = 0;
    private currentPlaybackFrameIndex = 0;

    public constructor(
        fileName: string,
        simulariumFile: SimulariumFileFormat,
        visData: VisData
    ) {
        this.fileName = fileName;
        this.visData = visData;
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
    public connectToUri(uri: string): void {}

    public disconnect(): void {
        this.abortRemoteSim();
    }

    public getIp(): string {
        return "";
    }

    public connectToRemoteServer(address: string): Promise<string> {
        return Promise.resolve("Local file successfully started");
    }

    public sendTimeStepUpdate(newTimeStep: number): void {}

    public sendParameterUpdate(paramName: string, paramValue: number): void {}

    public sendModelDefinition(model: string): void {}

    /**
     * Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    public startRemoteSimPreRun(timeStep: number, numTimeSteps: number): void {}

    public startRemoteSimLive(): void {}

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
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
            //this.visData.cacheJSON(spatialData);
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
            this.onTrajectoryDataArrive({
                msgType: 0,
                bundleStart: this.currentPlaybackFrameIndex,
                bundleSize: 1,
                bundleData: [
                    this.simulariumFile.spatialData.bundleData[
                        this.currentPlaybackFrameIndex
                    ],
                ],
                fileName: this.fileName,
            });
            this.currentPlaybackFrameIndex++;
        }, 1);
    }

    public abortRemoteSim(): void {
        window.clearInterval(this.playbackIntervalId);
        this.playbackIntervalId = 0;
        this.currentPlaybackFrameIndex = 0;
    }

    public requestSingleFrame(startFrameNumber: number): void {
        this.onTrajectoryDataArrive({
            msgType: 0,
            bundleStart: startFrameNumber,
            bundleSize: 1,
            bundleData: [
                this.simulariumFile.spatialData.bundleData[startFrameNumber],
            ],
            fileName: this.fileName,
        });
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
                this.onTrajectoryDataArrive({
                    msgType: 0,
                    bundleStart: theFrameNumber,
                    bundleSize: 1,
                    bundleData: [
                        this.simulariumFile.spatialData.bundleData[
                            theFrameNumber
                        ],
                    ],
                    fileName: this.fileName,
                });
            }
        }
    }

    public requestTrajectoryFileInfo(fileName: string): void {
        this.onTrajectoryFileInfoArrive(this.simulariumFile.trajectoryInfo);
    }
}
