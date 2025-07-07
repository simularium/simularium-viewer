import jsLogger from "js-logger";
import { isEmpty, noop } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { VisData, RemoteSimulator } from "../simularium/index.js";
import type {
    NetConnectionParams,
    TrajectoryFileInfo,
} from "../simularium/index.js";
import { VisGeometry } from "../visGeometry/index.js";
import {
    FileReturn,
    FILE_STATUS_SUCCESS,
    FILE_STATUS_FAIL,
    PlotConfig,
} from "../simularium/types.js";

import { ISimulator } from "../Simulator/ISimulator.js";
import { getSimulatorClassFromParams } from "../Simulator/SimulatorFactory.js";
import { FrontEndError } from "../simularium/FrontEndError.js";
import { TrajectoryType } from "../constants.js";
import { ConversionClient } from "../simularium/ConversionClient.js";
import { SimulatorParams } from "../Simulator/types.js";

jsLogger.setHandler(jsLogger.createDefaultHandler());

export default class SimulariumController {
    public simulator?: ISimulator;
    private lastNetConnectionConfig: NetConnectionParams | null;
    private _conversionClient?: ConversionClient;
    public visData: VisData;
    public visGeometry: VisGeometry | undefined;
    public tickIntervalLength: number;
    public handleTrajectoryInfo: (TrajectoryFileInfo) => void;
    public handleMetrics: (Metrics) => void;
    public handlePlotData: (Plots) => void;
    public startRecording: () => void;
    public stopRecording: () => void;
    public onError?: (error: FrontEndError) => void;

    private isPaused: boolean;
    private isFileChanging: boolean;
    private playBackFile: string;

    public constructor() {
        this.visData = new VisData();
        this.tickIntervalLength = 0; // Will be overwritten when a trajectory is loaded
        this.startRecording = () => noop;
        this.stopRecording = () => noop;

        this.handleTrajectoryInfo = (/*msg: TrajectoryFileInfo*/) => noop;
        this.handleMetrics = (/*msg: Metrics*/) => noop;
        this.handlePlotData = (/*msg: Plot[]*/) => noop;
        this.onError = (/*errorMessage*/) => noop;

        this.isPaused = false;
        this.isFileChanging = false;
        this.lastNetConnectionConfig = null;
        this.playBackFile = "";
        this.simulator = undefined;
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.resetCamera = this.resetCamera.bind(this);
        this.centerCamera = this.centerCamera.bind(this);
        this.reOrientCamera = this.reOrientCamera.bind(this);
        this.setPanningMode = this.setPanningMode.bind(this);
        this.setFocusMode = this.setFocusMode.bind(this);
        this.convertTrajectory = this.convertTrajectory.bind(this);
        this.setCameraType = this.setCameraType.bind(this);
        this.startSmoldynSim = this.startSmoldynSim.bind(this);
    }

    /**
     * @param error a string or an Error object, which can be of type
     * "unknown" if passed by a catch block
     */
    private handleError(error: unknown | string): void {
        let message: string;

        if (typeof error === "string") {
            message = error;
        } else if (error instanceof Error) {
            message = error.message;
        } else {
            message = "An unknown error occurred.";
        }

        if (this.onError) {
            this.onError(new FrontEndError(message));
        } else throw new Error(message);
    }

    private createSimulatorConnection(params: SimulatorParams): void {
        const { simulatorClass, typedParams } =
            getSimulatorClassFromParams(params);
        if (!simulatorClass) {
            this.handleError("Invalid simulator configuration");
            return;
        }
        this.lastNetConnectionConfig =
            "netConnectionSettings" in params &&
            params.netConnectionSettings !== undefined
                ? params.netConnectionSettings
                : null;
        if (
            this.visGeometry &&
            "geoAssets" in params &&
            !isEmpty(params.geoAssets)
        ) {
            this.visGeometry.geometryStore.cacheLocalAssets(params.geoAssets);
        }
        // will throw an error if the params are invalid
        this.simulator = new simulatorClass(typedParams, this.onError);
        this.simulator.setTrajectoryDataHandler(
            this.visData.parseAgentsFromNetData.bind(this.visData)
        );
        this.simulator.setTrajectoryFileInfoHandler(this.handleTrajectoryInfo);
        this.simulator.setMetricsHandler(this.handleMetrics);
        this.simulator.setPlotDataHandler(this.handlePlotData);
    }

    public get isChangingFile(): boolean {
        return this.isFileChanging;
    }

    private async start(): Promise<void> {
        if (!this.simulator) {
            return Promise.reject();
        }
        await this.simulator.initialize(this.playBackFile);
        this.simulator.requestFrame(0);
    }

    public time(): number {
        return this.visData.currentFrameData.time;
    }

    public stop(): void {
        this.pause();
        if (this.simulator) {
            this.simulator.abort();
        }
    }

    public sendUpdate(obj: Record<string, unknown>): void {
        if (this.simulator) {
            this.simulator.sendUpdate(obj);
        }
    }

    ///// Conversion Client /////

    public get conversionClient(): ConversionClient {
        if (!this._conversionClient) {
            throw new Error("Conversion client is not configured.");
        }
        return this._conversionClient;
    }

    private closeConversionConnection(): void {
        if (this._conversionClient) {
            this._conversionClient.cancelConversion();
            this._conversionClient.disconnect();
            this._conversionClient = undefined;
        }
    }

    private async setupConversion(
        netConnectionConfig: NetConnectionParams,
        fileName: string
    ): Promise<void> {
        const reuseSimulator = this.shouldReuseSimulator({
            netConnectionSettings: netConnectionConfig,
            fileName,
        });
        this.clearFileResources(reuseSimulator);

        this._conversionClient = new ConversionClient(
            netConnectionConfig,
            this.onError
        );

        this.conversionClient.setOnConversionCompleteHandler(() => {
            this.changeFile({
                netConnectionSettings: netConnectionConfig,
                fileName: fileName,
            });
            this.closeConversionConnection();
        });
    }

    public cancelConversion(): void {
        this.closeConversionConnection();
    }

    public async convertTrajectory(
        netConnectionConfig: NetConnectionParams,
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        providedFileName?: string
    ): Promise<void> {
        const fileName = providedFileName ?? `${uuidv4()}.simularium`;
        await this.setupConversion(netConnectionConfig, fileName);
        return this.conversionClient.convertTrajectory(
            dataToConvert,
            fileType,
            fileName
        );
    }

    public async startSmoldynSim(
        netConnectionConfig: NetConnectionParams,
        fileName: string,
        smoldynInput: string
    ): Promise<void> {
        await this.setupConversion(netConnectionConfig, fileName);
        return this.conversionClient.sendSmoldynData(fileName, smoldynInput);
    }

    public pause(): void {
        if (this.simulator) {
            this.simulator.pause();
        }
        this.isPaused = true;
    }

    public paused(): boolean {
        return this.isPaused;
    }

    public gotoTime(time: number): void {
        // If in the middle of changing files, ignore any gotoTime requests
        if (this.isFileChanging || !this.simulator) return;
        if (this.visData.hasLocalCacheForTime(time)) {
            this.visData.gotoTime(time);
        } else {
            // else reset the local cache,
            //  and play remotely from the desired simulation time
            this.visData.clearCache();
            this.simulator.requestFrameByTime(time);
        }
    }

    public playFromTime(time: number): void {
        this.gotoTime(time);
        this.isPaused = false;
    }

    public resume(): void {
        if (this.simulator) {
            this.simulator.stream();
            this.isPaused = false;
        }
    }

    ///// File Changing /////

    private clearFileResources(reuseSimulator = false): void {
        this.closeConversionConnection();
        this.stop();
        if (!reuseSimulator) {
            this.simulator = undefined;
        }
        this.playBackFile = "";
        this.visData.clearForNewTrajectory();
        if (this.visGeometry) {
            this.visGeometry.clearForNewTrajectory();
            this.visGeometry.resetCamera();
        }
    }

    public clearFile(): void {
        this.isFileChanging = false;
        this.clearFileResources();
    }

    // export interface NetConnectionParams {
    // serverIp?: string;
    // serverPort?: number;
    // }

    private shouldReuseSimulator(params: SimulatorParams): boolean {
        const newConfig =
            "netConnectionSettings" in params
                ? params.netConnectionSettings
                : undefined;
        const lastConfig = this.lastNetConnectionConfig;

        return (
            this.simulator instanceof RemoteSimulator &&
            this.simulator.isConnectedToRemoteServer() &&
            lastConfig?.serverIp != null &&
            lastConfig?.serverPort != null &&
            newConfig?.serverIp != null &&
            newConfig?.serverPort != null &&
            lastConfig.serverIp === newConfig.serverIp &&
            lastConfig.serverPort === newConfig.serverPort
        );
    }

    public async changeFile(params: SimulatorParams): Promise<FileReturn> {
        if (
            "simulariumFile" in params &&
            !params.fileName.includes(".simularium")
        ) {
            this.handleError("File must be a .simularium file");
            return Promise.reject({ status: FILE_STATUS_FAIL });
        }
        this.isFileChanging = true;
        const reuseSimulator = this.shouldReuseSimulator(params);
        this.clearFileResources(reuseSimulator);
        if (!reuseSimulator) {
            this.createSimulatorConnection(params);
        }
        this.playBackFile = params.fileName;
        try {
            await this.start();
            return { status: FILE_STATUS_SUCCESS };
        } catch (e) {
            this.handleError(e);
            return { status: FILE_STATUS_FAIL };
        }
    }

    public markFileChangeAsHandled(): void {
        this.isFileChanging = false;
    }

    public getFile(): string {
        return this.playBackFile;
    }

    public async getMetrics(): Promise<void> {
        this.simulator?.requestAvailableMetrics();
    }

    public async getPlotData(requestedPlots: PlotConfig[]): Promise<void> {
        this.simulator?.requestPlotData(requestedPlots);
    }

    public clearLocalCache(): void {
        this.visData.clearCache();
    }

    public set trajFileInfoCallback(
        callback: (msg: TrajectoryFileInfo) => void
    ) {
        this.handleTrajectoryInfo = callback;
        if (this.simulator) {
            this.simulator.setTrajectoryFileInfoHandler(callback);
        }
    }

    public set onMetricsCallback(callback: (msg: unknown) => void) {
        this.handleMetrics = callback;
        if (this.simulator) {
            this.simulator.setMetricsHandler(callback);
        }
    }

    public set onPlotDataCallback(callback: (msg: unknown) => void) {
        this.handlePlotData = callback;
        if (this.simulator) {
            this.simulator.setPlotDataHandler(callback);
        }
    }

    /**
     * Camera controls
     * simulariumController.visGeometry gets set in
     * componentDidMount of the viewer, so as long as the dom is mounted
     * these functions will be callable.
     */

    public zoomIn(): void {
        this.visGeometry?.zoomIn();
    }

    public zoomOut(): void {
        this.visGeometry?.zoomOut();
    }

    public resetCamera(): void {
        this.visGeometry?.resetCamera();
    }

    public centerCamera(): void {
        this.visGeometry?.centerCamera();
    }

    public reOrientCamera(): void {
        this.visGeometry?.reOrientCamera();
    }

    public setPanningMode(pan: boolean): void {
        this.visGeometry?.setPanningMode(pan);
    }

    public setAllowViewPanning(allow: boolean): void {
        this.visGeometry?.setAllowViewPanning(allow);
    }

    public setFocusMode(focus: boolean): void {
        this.visGeometry?.setFocusMode(focus);
    }

    public setCameraType(ortho: boolean): void {
        this.visGeometry?.setCameraType(ortho);
    }
}

export { SimulariumController };
