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

import { ClientSimulator } from "../simularium/ClientSimulator.js";
import { IClientSimulatorImpl } from "../simularium/localSimulators/IClientSimulatorImpl.js";
import { ISimulator } from "../simularium/ISimulator.js";
import { LocalFileSimulator } from "../simularium/LocalFileSimulator.js";
import { FrontEndError } from "../simularium/FrontEndError.js";
import type { ISimulariumFile } from "../simularium/ISimulariumFile.js";
import { TrajectoryType } from "../constants.js";
import { ConversionClient } from "../simularium/OctopusClient.js";

jsLogger.setHandler(jsLogger.createDefaultHandler());

// TODO: refine this as part of the public API for initializing the
// controller with a simulator connection
interface SimulatorConnectionParams {
    netConnectionSettings?: NetConnectionParams;
    clientSimulator?: IClientSimulatorImpl;
    simulariumFile?: ISimulariumFile;
    geoAssets?: { [key: string]: string };
    requestJson?: boolean;
}

export default class SimulariumController {
    public simulator?: ISimulator;
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
        this.initNewFile = this.initNewFile.bind(this);
    }

    private createSimulatorConnection(
        netConnectionConfig?: NetConnectionParams,
        clientSimulator?: IClientSimulatorImpl,
        localFile?: ISimulariumFile,
        geoAssets?: { [key: string]: string },
        requestJson?: boolean
    ): void {
        if (clientSimulator) {
            this.simulator = new ClientSimulator(clientSimulator);
            this.simulator.setTrajectoryDataHandler(
                this.visData.parseAgentsFromNetData.bind(this.visData)
            );
        } else if (localFile) {
            this.simulator = new LocalFileSimulator(
                this.playBackFile,
                localFile
            );
            if (this.visGeometry && geoAssets && !isEmpty(geoAssets)) {
                this.visGeometry.geometryStore.cacheLocalAssets(geoAssets);
            }
            this.simulator.setTrajectoryDataHandler(
                this.visData.parseAgentsFromFrameData.bind(this.visData)
            );
        } else if (netConnectionConfig) {
            this._conversionClient = new ConversionClient(
                netConnectionConfig,
                this.playBackFile,
                this.onError
            );
            this.simulator = new RemoteSimulator(
                netConnectionConfig,
                this.playBackFile,
                this.onError,
                requestJson
            );
            this.simulator.setTrajectoryDataHandler(
                this.visData.parseAgentsFromNetData.bind(this.visData)
            );
        } else {
            // caught in try/catch block, not sent to front end
            throw new Error(
                "Insufficient data to determine and configure simulator connection"
            );
        }

        this.simulator.setTrajectoryFileInfoHandler(
            (trajFileInfo: TrajectoryFileInfo) => {
                this.handleTrajectoryInfo(trajFileInfo);
            }
        );
    }

    public get isChangingFile(): boolean {
        return this.isFileChanging;
    }

    public start(): Promise<void> {
        if (!this.simulator) {
            return Promise.reject();
        }

        this.isPaused = false;
        this.visData.clearCache();

        return this.simulator.initialize(this.playBackFile);
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

    ///// Conversion Client /////

    public get conversionClient(): ConversionClient {
        if (
            !this._conversionClient ||
            !this._conversionClient.isConnectedToRemoteServer()
        ) {
            throw new Error(
                "Conversion client is not configured or socket is invalid."
            );
        }
        return this._conversionClient;
    }

    private async configureConversionClient(
        config: NetConnectionParams
    ): Promise<void> {
        this._conversionClient = new ConversionClient(
            config,
            this.playBackFile,
            this.onError
        );

        await this.conversionClient.initialize(this.playBackFile);
    }

    private isConversionClientConfigured(): boolean {
        return !!(
            this.conversionClient &&
            this.conversionClient.isConnectedToRemoteServer()
        );
    }

    private closeConversionConnection(): void {
        this.conversionClient?.disconnect();
        this._conversionClient = undefined;
    }

    private async setupConversion(
        netConnectionConfig: NetConnectionParams,
        fileName: string
    ): Promise<void> {
        this.cancelCurrentFile(fileName);
        try {
            if (!this.isConversionClientConfigured()) {
                await this.configureConversionClient(netConnectionConfig);
            }

            return this.conversionClient.setOnConversionCompleteHandler(() => {
                this.changeFile(
                    {
                        netConnectionSettings: netConnectionConfig,
                    },
                    this.playBackFile
                );
                this.closeConversionConnection();
            });
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public cancelConversion(): void {
        if (this._conversionClient) {
            this._conversionClient.cancelConversion();
        }
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
            this.isPaused = true;
        }
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

    public clearFile(): void {
        this.stop();
        this.isFileChanging = false;
        this.playBackFile = "";
        this.visData.clearForNewTrajectory();
        this.simulator?.abort();
        this.pause();
        if (this.visGeometry) {
            this.visGeometry.clearForNewTrajectory();
            this.visGeometry.resetCamera();
        }
    }

    public handleFileChange(
        simulariumFile: ISimulariumFile,
        fileName: string,
        geoAssets?: { [key: string]: string }
    ): Promise<FileReturn> {
        if (!fileName.includes(".simularium")) {
            throw new Error("File must be a .simularium file");
        }

        if (geoAssets) {
            return this.changeFile({ simulariumFile, geoAssets }, fileName);
        } else {
            return this.changeFile({ simulariumFile }, fileName);
        }
    }

    public cancelCurrentFile(newFileName: string): void {
        this.isFileChanging = true;
        this.playBackFile = newFileName;

        // calls simulator.abort()
        this.stop();

        this.visData.WaitForFrame(0);
        this.visData.clearForNewTrajectory();
    }

    public initNewFile(
        connectionParams: SimulatorConnectionParams
    ): Promise<FileReturn> {
        this.createSimulatorConnection(
            connectionParams.netConnectionSettings,
            connectionParams.clientSimulator,
            connectionParams.simulariumFile,
            connectionParams.geoAssets,
            connectionParams.requestJson
        );

        // start the simulation paused and get first frame
        if (this.simulator) {
            return this.start() // will reject if no simulator
                .then(() => {
                    if (this.simulator) {
                        this.simulator.requestFrame(0);
                    }
                })
                .then(() => ({
                    status: FILE_STATUS_SUCCESS,
                }));
        }

        return Promise.reject({
            status: FILE_STATUS_FAIL,
        });
    }

    public changeFile(
        connectionParams: SimulatorConnectionParams,
        // TODO: push newFileName into connectionParams
        newFileName: string
    ): Promise<FileReturn> {
        this.cancelCurrentFile(newFileName);
        return this.initNewFile(connectionParams);
    }

    public markFileChangeAsHandled(): void {
        this.isFileChanging = false;
    }

    public getFile(): string {
        return this.playBackFile;
    }

    public async getMetrics(config: NetConnectionParams): Promise<void> {
        if (this.simulator instanceof LocalFileSimulator) {
            await this.simulator.setupMetricsCalculator(config);
        }

        this.simulator?.requestAvailableMetrics();
    }

    public async getPlotData(
        config: NetConnectionParams,
        requestedPlots: PlotConfig[]
    ): Promise<void> {
        if (this.simulator instanceof LocalFileSimulator) {
            await this.simulator.setupMetricsCalculator(config);
        }
        this.simulator?.requestPlotData({}, requestedPlots);
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
