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

import {
    getClassFromParams,
    ISimulator,
} from "../simularium/Simulator/ISimulator.js";
import { LocalFileSimulator } from "../simularium/Simulator/LocalFileSimulator.js";
import { FrontEndError } from "../simularium/FrontEndError.js";
import type { ISimulariumFile } from "../simularium/ISimulariumFile.js";
import { WebsocketClient } from "../simularium/WebsocketClient.js";
import { TrajectoryType } from "../constants.js";
import { RemoteMetricsCalculator } from "../simularium/RemoteMetricsCalculator.js";
import { OctopusServicesClient } from "../simularium/OctopusClient.js";
import { isLocalFileSimulatorParams } from "../util.js";
import { SimulatorParams } from "../simularium/Simulator/types.js";

jsLogger.setHandler(jsLogger.createDefaultHandler());

export default class SimulariumController {
    public simulator?: ISimulator;
    public _octopusClient?: OctopusServicesClient;
    public metricsCalculator?: RemoteMetricsCalculator;
    public visData: VisData;
    public visGeometry: VisGeometry | undefined;
    public tickIntervalLength: number;
    public handleTrajectoryInfo: (TrajectoryFileInfo) => void;
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
        this.onError = (/*errorMessage*/) => noop;

        this.isPaused = false;
        this.isFileChanging = false;
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
        this.cancelCurrentFile = this.cancelCurrentFile.bind(this);
    }

    private handleError(message: string): void {
        if (this.onError) {
            return this.onError(new FrontEndError(message));
        } else {
            throw new Error(message);
        }
    }

    public initSimulator(params: SimulatorParams) {
        if (!params) {
            this.handleError("Invalid simulator configuration");
        }
        if (!params.fileName) {
            this.handleError("Invalid simulator configuration: no file name");
        }
        const { simulatorClass, typedParams } = getClassFromParams(params);
        if (!simulatorClass) {
            this.handleError("Invalid simulator configuration");
            return;
        }
        if (
            this.visGeometry &&
            "geoAssets" in params &&
            !isEmpty(params.geoAssets)
        ) {
            this.visGeometry.geometryStore.cacheLocalAssets(params.geoAssets);
        }
        // will throw an error if the params are invalid
        return new simulatorClass(typedParams, this.onError);
    }

    private createSimulatorConnection(params: SimulatorParams): void {
        this.simulator = this.initSimulator(params);
        if (!this.simulator) {
            return;
        }
        this.simulator.setTrajectoryDataHandler(
            this.visData.parseAgentsFromNetData.bind(this.visData)
        );
        this.simulator.setTrajectoryFileInfoHandler(
            (trajFileInfo: TrajectoryFileInfo) => {
                this.handleTrajectoryInfo(trajFileInfo);
            }
        );
        this.playBackFile = params.fileName;
    }

    public configureOctopus(config: NetConnectionParams): Promise<string> {
        const webSocketClient =
            this.remoteWebsocketClient ||
            new WebsocketClient(config, this.onError);

        this._octopusClient = new OctopusServicesClient(webSocketClient);

        return this.octopusClient.connectToRemoteServer();
    }

    public isSimulatorConfigured(): boolean {
        return !!this.simulator;
    }

    public get octopusClient(): OctopusServicesClient {
        if (!this._octopusClient || !this._octopusClient.socketIsValid()) {
            throw new Error(
                "Remote Octopus client is not configured or socket is invalid."
            );
        }
        return this._octopusClient;
    }

    public isRemoteOctopusClientConfigured(): boolean {
        return !!(this.octopusClient && this.octopusClient.socketIsValid());
    }

    public get isChangingFile(): boolean {
        return this.isFileChanging;
    }

    public async start(): Promise<void> {
        if (!this.simulator) {
            return Promise.reject();
        }

        this.isPaused = false;
        this.clearLocalCache();

        try {
            await this.simulator.initialize(this.playBackFile);
            this.simulator.requestFrame(0);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public time(): number {
        return this.visData.currentFrameData.time;
    }

    public stop(): void {
        if (this.simulator) {
            this.simulator.abort();
        }
        this.simulator = undefined;
    }

    public sendUpdate(obj: Record<string, unknown>): void {
        if (this.simulator) {
            this.simulator.sendUpdate(obj);
        }
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
            // and play remotely from the desired simulation time
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

    public clearFile(): void {
        this.isFileChanging = false;
        this.clearFileResources();
    }

    private cancelCurrentFile(): void {
        this.isFileChanging = true;
        this.clearFileResources();
    }

    private clearFileResources(): void {
        this.pause();
        this.stop();
        this.octopusClient?.cancelConversion();
        this.playBackFile = "";
        this.visData.clearForNewTrajectory();
        if (this.visGeometry) {
            this.visGeometry.clearForNewTrajectory();
            this.visGeometry.resetCamera();
        }
    }

    /**
     * Configure and initialize and a new simulator for playback,
     * in response to incoming params. Handles local files,
     * client simulator implementations, and remote simulations.
     */
    public changeFile(params: SimulatorParams): Promise<FileReturn> {
        if (isLocalFileSimulatorParams(params)) {
            if (!/.+\.simularium$/i.test(params.fileName)) {
                return Promise.reject(
                    new Error("File must be a .simularium file")
                );
            }
        }
        try {
            this.cancelCurrentFile();
            this.createSimulatorConnection(params);
            return this.start().then(() => ({
                status: FILE_STATUS_SUCCESS,
            }));
        } catch (e) {
            const error = e as Error;
            console.warn(error.message);
            return Promise.reject({ status: FILE_STATUS_FAIL });
        }
    }

    /**
     * Setup for file conversion with common initialization steps.
     * Analogous to changeFile, but for file conversion and
     * running Smoldyn sims via the BioSimulators API.
     */
    private setupConversion(
        netConnectionConfig: NetConnectionParams,
        fileName: string
    ): void {
        this.cancelCurrentFile();
        this.createSimulatorConnection({
            netConnectionSettings: netConnectionConfig,
            fileName,
        });
        this.octopusClient.setOnConversionCompleteHandler(() => {
            this.start();
        });
    }

    /**
     * Converts trajectory data via Octopus autoconversion service
     */
    public convertTrajectory(
        netConnectionConfig: NetConnectionParams,
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        providedFileName?: string
    ): Promise<void> {
        const fileName = providedFileName ?? `${uuidv4()}.simularium`;

        try {
            this.setupConversion(netConnectionConfig, fileName);
            return this.octopusClient.convertTrajectory(
                dataToConvert,
                fileType,
                fileName
            );
        } catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Sends data to run a Smoldyn simulation via the BioSimulatorsAPI,
     * and loads it after Octopus converts it to Simularium format.
     */
    public startSmoldynSim(
        netConnectionConfig: NetConnectionParams,
        fileName: string,
        smoldynInput: string
    ): Promise<void> {
        try {
            this.setupConversion(netConnectionConfig, fileName);
            return this.octopusClient.sendSmoldynData(fileName, smoldynInput);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public markFileChangeAsHandled(): void {
        this.isFileChanging = false;
    }

    public getFile(): string {
        return this.playBackFile;
    }

    public checkServerHealth(
        handler: () => void,
        netConnectionConfig: NetConnectionParams
    ): void {
        if (!this.isRemoteOctopusClientConfigured()) {
            this.configureOctopus(netConnectionConfig);
        }

        this.octopusClient.setHealthCheckHandler(handler);
        this.octopusClient.checkServerHealth();
    }

    public cancelConversion(): void {
        this.octopusClient.cancelConversion();
    }

    private get remoteWebsocketClient(): WebsocketClient | null {
        if (!this.simulator) {
            return null;
        }
        return this.simulator?.getWebsocket();
    }

    private setupMetricsCalculator(
        config: NetConnectionParams
    ): RemoteMetricsCalculator {
        const webSocketClient =
            this.remoteWebsocketClient &&
            this.remoteWebsocketClient.socketIsValid()
                ? this.remoteWebsocketClient
                : new WebsocketClient(config, this.onError);
        return new RemoteMetricsCalculator(webSocketClient, this.onError);
    }

    public async getMetrics(config: NetConnectionParams): Promise<void> {
        if (
            !this.metricsCalculator ||
            !this.metricsCalculator.socketIsValid()
        ) {
            this.metricsCalculator = this.setupMetricsCalculator(config);
            await this.metricsCalculator.connectToRemoteServer();
        }
        this.metricsCalculator.getAvailableMetrics();
    }

    public async getPlotData(
        config: NetConnectionParams,
        requestedPlots: PlotConfig[]
    ): Promise<void> {
        if (!this.simulator) {
            return;
        }

        if (
            !this.metricsCalculator ||
            !this.metricsCalculator.socketIsValid()
        ) {
            this.metricsCalculator = this.setupMetricsCalculator(config);
            await this.metricsCalculator.connectToRemoteServer();
        }

        if (this.simulator instanceof LocalFileSimulator) {
            const simulariumFile: ISimulariumFile =
                this.simulator.getSimulariumFile();
            this.metricsCalculator.getPlotData(
                simulariumFile["simulariumFile"],
                requestedPlots
            );
        } else if (this.simulator instanceof RemoteSimulator) {
            // we don't have the simularium file, so we'll just send an empty data object
            this.metricsCalculator.getPlotData(
                {},
                requestedPlots,
                this.simulator.getLastRequestedFile()
            );
        }
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
