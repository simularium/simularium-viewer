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
import { FrontEndError } from "../simularium/FrontEndError.js";
import { TrajectoryType } from "../constants.js";
import { ConversionClient } from "../simularium/ConversionClient.js";
import { SimulatorParams } from "../simularium/Simulator/types.js";

jsLogger.setHandler(jsLogger.createDefaultHandler());

export default class SimulariumController {
    public simulator?: ISimulator;
    private lastNetConnectionConfig: NetConnectionParams | null;
    public _conversionClient?: ConversionClient;
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
     * "unknown" passed by a catch block
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
        this.simulator = new simulatorClass(typedParams, this.onError);
        this.simulator.setTrajectoryDataHandler(
            this.visData.parseAgentsFromNetData.bind(this.visData)
        );
        this.simulator.setTrajectoryFileInfoHandler(
            (trajFileInfo: TrajectoryFileInfo) => {
                this.handleTrajectoryInfo(trajFileInfo);
                this.playBackFile = params.fileName;
            }
        );
    }

    public get isChangingFile(): boolean {
        return this.isFileChanging;
    }

    public async start(): Promise<void> {
        if (!this.simulator) {
            return Promise.reject();
        }
        await this.simulator.initialize(this.playBackFile);
        this.simulator.requestFrame(0);
        return Promise.resolve();
    }

    public time(): number {
        return this.visData.currentFrameData.time;
    }

    public stop(): void {
        if (this.simulator) {
            this.simulator.abort();
        }
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

    public clearFile(reuseSimulator = false): void {
        this.isFileChanging = false;
        this.clearFileResources(reuseSimulator);
    }

    private shouldReuseSimulator(params: SimulatorParams): boolean {
        return (
            "netConnectionSettings" in params &&
            this.simulator instanceof RemoteSimulator &&
            this.simulator.isConnectedToRemoteServer() &&
            this.lastNetConnectionConfig === params.netConnectionSettings
        );
    }

    private resetSimulatorConnection(params: SimulatorParams): void {
        this.clearFileResources();
        this.createSimulatorConnection(params);
        if (
            "netConnectionSettings" in params &&
            params.netConnectionSettings !== undefined
        ) {
            this.lastNetConnectionConfig = params.netConnectionSettings;
        } else {
            this.lastNetConnectionConfig = null;
        }
    }

    private clearFileResources(reuseSimulator = false): void {
        this.pause();
        this.stop();
        if (!reuseSimulator) {
            this.simulator = undefined;
        }
        this._conversionClient?.cancelConversion();
        this.playBackFile = "";
        this.visData.clearForNewTrajectory();
        if (this.visGeometry) {
            this.visGeometry.clearForNewTrajectory();
            this.visGeometry.resetCamera();
        }
        this.isPaused = false;
    }

    ////// Conversion //////

    /**
     * Configure and initialize and a new simulator for playback,
     * in response to incoming params. Handles local files,
     * client simulator implementations, and remote simulations.
     */
    public async changeFile(params: SimulatorParams): Promise<FileReturn> {
        this.isFileChanging = true;
        if (this.shouldReuseSimulator(params)) {
            this.clearFileResources(true); // reuse simulator flag
        } else {
            this.resetSimulatorConnection(params);
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

    private async configureConversionClient(
        config: NetConnectionParams
    ): Promise<void> {
        this._conversionClient = new ConversionClient(
            config,
            this.playBackFile,
            this.onError
        );
        await this._conversionClient.initialize(this.playBackFile);
    }

    public get conversionClient(): ConversionClient {
        if (
            !this._conversionClient ||
            !this._conversionClient.isConnectedToRemoteServer()
        ) {
            throw new Error(
                "Remote Octopus client is not configured or socket is invalid."
            );
        }
        return this._conversionClient;
    }

    private closeConversionConnection(): void {
        this.conversionClient?.disconnect();
        this._conversionClient = undefined;
    }

    /**
     * Setup for file conversion with common initialization steps.
     * Analogous to changeFile, but for file conversion and
     * running Smoldyn sims via the BioSimulators API.
     */
    private async setupConversion(
        netConnectionConfig: NetConnectionParams,
        fileName: string
    ): Promise<void> {
        this.isFileChanging = true;
        await this.configureConversionClient(netConnectionConfig);
        this.resetSimulatorConnection({
            netConnectionSettings: netConnectionConfig,
            fileName,
        });
        this.playBackFile = fileName;
        this.conversionClient.setOnConversionCompleteHandler(() => {
            this.start();
            this.closeConversionConnection();
        });
    }

    /**
     * Converts trajectory data via Octopus autoconversion service.
     */
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

    /**
     * Sends data to run a Smoldyn simulation via the BioSimulatorsAPI,
     * and load it after Octopus converts it to Simularium format.
     */
    public async startSmoldynSim(
        netConnectionConfig: NetConnectionParams,
        fileName: string,
        smoldynInput: string
    ): Promise<void> {
        try {
            await this.setupConversion(netConnectionConfig, fileName);
            return this.conversionClient.sendSmoldynData(
                fileName,
                smoldynInput
            );
        } catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Called in viewport animate loop.
     */
    public markFileChangeAsHandled(): void {
        this.isFileChanging = false;
    }

    public getFile(): string {
        return this.playBackFile;
    }

    public cancelConversion(): void {
        this.conversionClient.cancelConversion();
    }

    ///// Metrics and plots /////

    public async getMetrics(): Promise<void> {
        if (!this.simulator) {
            return;
        }
        this.simulator.requestAvailableMetrics();
    }

    public async getPlotData(requestedPlots: PlotConfig[]): Promise<void> {
        if (!this.simulator) {
            return;
        }
        this.simulator.requestPlotData({}, requestedPlots);
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
