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
    protected visData: VisData; // for cacheJSON
    protected simulariumFile: SimulariumFileFormat;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage) => void;

    public constructor(simulariumFile: SimulariumFileFormat, visData: VisData) {
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

    public disconnect(): void {}

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
            this.visData.cacheJSON(spatialData);
            this.onTrajectoryFileInfoArrive(trajectoryInfo);
        } catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve();
    }

    public pauseRemoteSim(): void {}

    public resumeRemoteSim(): void {}

    public abortRemoteSim(): void {}

    public requestSingleFrame(startFrameNumber: number): void {}

    public gotoRemoteSimulationTime(timeNanoSeconds: number): void {}

    public requestTrajectoryFileInfo(fileName: string): void {}
}
