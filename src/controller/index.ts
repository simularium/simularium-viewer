import jsLogger from "js-logger";
import { isEmpty, noop } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { VisData, RemoteSimulator } from "../simularium/index.js";
import type {
    NetConnectionParams,
    Plot,
    TrajectoryFileInfo,
    UIDisplayData,
} from "../simularium/index.js";
import { VisGeometry } from "../visGeometry/index.js";
import {
    FileReturn,
    FILE_STATUS_SUCCESS,
    FILE_STATUS_FAIL,
    PlotConfig,
    CachedFrame,
} from "../simularium/types.js";

import { ClientSimulator } from "../simularium/ClientSimulator.js";
import { IClientSimulatorImpl } from "../simularium/localSimulators/IClientSimulatorImpl.js";
import { ISimulator } from "../simularium/ISimulator.js";
import { LocalFileSimulator } from "../simularium/LocalFileSimulator.js";
import { FrontEndError } from "../simularium/FrontEndError.js";
import type { ISimulariumFile } from "../simularium/ISimulariumFile.js";
import { WebsocketClient } from "../simularium/WebsocketClient.js";
import { TrajectoryType } from "../constants.js";
import { RemoteMetricsCalculator } from "../simularium/RemoteMetricsCalculator.js";
import { OctopusServicesClient } from "../simularium/OctopusClient.js";
import { JsonFileWriter } from "../simularium/JsonFileWriter.js";

jsLogger.setHandler(jsLogger.createDefaultHandler());

// TODO: refine this as part of the public API for initializing the
// controller (also see SimulatorConnectionParams below)
interface SimulariumControllerParams {
    remoteSimulator?: RemoteSimulator;
    netConnectionSettings?: NetConnectionParams;
    trajectoryPlaybackFile?: string;
}

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
    public remoteWebsocketClient?: WebsocketClient;
    public octopusClient?: OctopusServicesClient;
    public metricsCalculator?: RemoteMetricsCalculator;
    public visData: VisData;
    public visGeometry: VisGeometry | undefined;
    public tickIntervalLength: number;
    public handleTrajectoryInfo: (TrajectoryFileInfo) => void;
    public handleMetrics: (metrics: Record<string, unknown>) => void;
    public handlePlots: (plots: Plot[]) => void;
    public postConnect: () => void;
    public startRecording: () => void;
    public stopRecording: () => void;
    public onStreamingChange: (streaming: boolean) => void;
    public onError?: (error: FrontEndError) => void;

    public isFileChanging: boolean;
    public isWritingToFile: boolean;
    public streaming: boolean;
    private playBackFile: string;

    public constructor(params: SimulariumControllerParams) {
        this.visData = new VisData();
        this.tickIntervalLength = 0; // Will be overwritten when a trajectory is loaded
        this.postConnect = () => noop;
        this.startRecording = () => noop;
        this.stopRecording = () => noop;

        this.handleTrajectoryInfo = (/*msg: TrajectoryFileInfo*/) => noop;
        this.handleMetrics = (/*metrics: Record<string, unknown>*/) => noop;
        this.handlePlots = (/*plots: Plot[]*/) => noop;
        this.onError = (/*errorMessage*/) => noop;
        this.onStreamingChange = (/*streaming: boolean*/) => noop;

        // might only be used in unit testing
        // TODO: change test so controller isn't initialized with a remoteSimulator
        if (params.remoteSimulator) {
            this.simulator = params.remoteSimulator;
            this.simulator.setTrajectoryFileInfoHandler(
                (trajFileInfo: TrajectoryFileInfo) => {
                    this.handleTrajectoryInfo(trajFileInfo);
                }
            );
            this.simulator.setTrajectoryDataHandler(
                this.visData.parseAgentsFromNetData.bind(this.visData)
            );
            // TODO: probably remove this? We're never initalizing the controller
            // with any settings on the website.
        } else if (params.netConnectionSettings) {
            this.createSimulatorConnection(
                params.netConnectionSettings,
                undefined,
                undefined
            );
        } else {
            // No network information was passed in
            //  the viewer will be initialized blank

            this.simulator = undefined;

            // @TODO: Pass this warning upwards (to installing app)
            if (params.trajectoryPlaybackFile) {
                console.warn(
                    "trajectoryPlaybackFile param ignored, no network config provided"
                );
            }
        }

        this.isFileChanging = false;
        this.streaming = false;
        this.isWritingToFile = false;
        this.playBackFile = params.trajectoryPlaybackFile || "";
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
            const webSocketClient = new WebsocketClient(
                netConnectionConfig,
                this.onError
            );
            this.remoteWebsocketClient = webSocketClient;
            this.octopusClient = new OctopusServicesClient(webSocketClient);
            this.simulator = new RemoteSimulator(
                webSocketClient,
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
        this.visData.setOnCacheLimitReached(() => {
            this.pauseStreaming();
        });
    }

    public configureNetwork(config: NetConnectionParams): void {
        if (this.simulator) {
            this.simulator.abort();
        }
        this.createSimulatorConnection(config);
    }

    public isRemoteOctopusClientConfigured(): boolean {
        return !!(
            this.simulator &&
            this.octopusClient &&
            this.remoteWebsocketClient?.socketIsValid()
        );
    }

    public get isChangingFile(): boolean {
        return this.isFileChanging;
    }

    public setOnStreamingChangeCallback(
        onStreamingChange: (streaming: boolean) => void
    ): void {
        this.onStreamingChange = onStreamingChange;
    }

    public setOnMetricsArriveCallback(
        onMetricsArrive: (metrics: Record<string, unknown>) => void
    ): void {
        this.handleMetrics = onMetricsArrive;
    }

    public setOnPlotDataArriveCallback(
        onPlotDataArrive: (plots: Plot[]) => void
    ): void {
        this.handlePlots = onPlotDataArrive;
    }

    private handleStreamingChange(streaming: boolean): void {
        this.streaming = streaming;
        this.onStreamingChange(streaming);
    }

    public isStreaming(): boolean {
        return this.streaming;
    }

    // Not called by viewer, but could be called by
    // parent app
    // todo candidate for removal? not called in website
    public connect(): Promise<string> {
        if (!this.remoteWebsocketClient) {
            return Promise.reject(
                new Error(
                    "No network connection established in simularium controller."
                )
            );
        }

        return this.remoteWebsocketClient
            .connectToRemoteServer()
            .then((msg: string) => {
                this.postConnect();
                return msg;
            });
    }

    public start(): Promise<void> {
        if (!this.simulator) {
            return Promise.reject();
        }

        this.visData.clearCache();

        return this.simulator.initialize(this.playBackFile);
    }

    public time(): number {
        return this.visData.currentFrameData.time;
    }

    public stop(): void {
        if (this.simulator) {
            this.simulator.abort();
            this.handleStreamingChange(false);
        }
    }

    public sendUpdate(obj: Record<string, unknown>): void {
        if (this.simulator) {
            this.simulator.sendUpdate(obj);
        }
    }

    public convertTrajectory(
        netConnectionConfig: NetConnectionParams,
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        providedFileName?: string
    ): Promise<void> {
        const fileName = providedFileName ?? `${uuidv4()}.simularium`;
        this.cancelCurrentFile(fileName);
        try {
            if (!this.isRemoteOctopusClientConfigured()) {
                this.configureNetwork(netConnectionConfig);
            }
            if (!this.octopusClient) {
                throw new Error("Octopus client not configured");
            }
            if (!this.simulator) {
                throw new Error("Simulator not initialized");
            }
            return this.octopusClient.convertTrajectory(
                dataToConvert,
                fileType,
                fileName
            );
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public pauseStreaming(): void {
        if (this.simulator) {
            this.handleStreamingChange(false);
            // todo add frame argument once octopus supports this
            this.simulator.pause();
        }
    }

    public paused(): boolean {
        return !this.isPlaying();
    }

    public initializeTrajectoryFile(): void {
        if (this.simulator) {
            this.simulator.initialize(this.playBackFile);
        }
    }

    public startSmoldynSim(
        netConnectionConfig: NetConnectionParams,
        fileName: string,
        smoldynInput: string
    ): Promise<void> {
        this.cancelCurrentFile(fileName);
        try {
            if (!this.isRemoteOctopusClientConfigured()) {
                this.configureNetwork(netConnectionConfig);
            }
            if (!this.octopusClient) {
                throw new Error("Octopus client not configured");
            }
            if (!this.simulator) {
                throw new Error("Simulator not initialized");
            }
            return this.octopusClient.sendSmoldynData(fileName, smoldynInput);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    private clampFrameNumber(frame: number): number {
        return Math.max(0, Math.min(frame, this.visData.totalSteps - 1));
    }

    private getFrameAtTime(time: number): number {
        const frameNumber = Math.round(time / this.visData.timeStepSize);
        const clampedFrame = this.clampFrameNumber(frameNumber);
        return clampedFrame;
    }

    public movePlaybackFrame(frameNumber: number): void {
        if (this.streaming) {
            this.pauseStreaming();
        }
        const clampedFrame = this.clampFrameNumber(frameNumber);
        if (this.isFileChanging || !this.simulator) return;
        if (this.visData.hasLocalCacheForFrame(clampedFrame)) {
            this.visData.gotoFrame(clampedFrame);
            this.resumeStreaming();
        } else if (this.simulator) {
            this.clearLocalCache();
            this.visData.WaitForFrame(clampedFrame);
            this.visData.currentFrameNumber = clampedFrame;
            this.resumeStreaming(clampedFrame);
        }
    }

    public gotoTime(time: number): void {
        const targetFrame = this.getFrameAtTime(time);
        this.movePlaybackFrame(targetFrame);
    }

    public playFromTime(time: number): void {
        this.gotoTime(time);
        this.visData.isPlaying = true;
    }

    public initalizeStreaming(): void {
        if (this.simulator) {
            this.simulator.stream();
            this.handleStreamingChange(true);
        }
    }

    public resumeStreaming(startFrame?: number): void {
        if (this.streaming) {
            return;
        }
        let requestFrame: number | null = null;
        if (startFrame !== undefined) {
            requestFrame = startFrame;
        } else if (this.visData.remoteStreamingHeadPotentiallyOutOfSync) {
            requestFrame = this.visData.currentStreamingHead;
        }
        if (this.simulator) {
            if (requestFrame !== null) {
                this.simulator.requestFrame(requestFrame);
            }
            this.simulator.stream();
            this.handleStreamingChange(true);
        }
    }

    // pause playback
    public pause(): void {
        this.visData.isPlaying = false;
    }

    // resume playback
    public resume(): void {
        this.visData.isPlaying = true;
        this.resumeStreaming();
    }

    public clearFile(): void {
        this.isFileChanging = false;
        this.playBackFile = "";
        this.visData.clearForNewTrajectory();
        this.simulator?.abort();
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
        connectionParams: SimulatorConnectionParams,
        keepRemoteConnection = false
    ): Promise<FileReturn> {
        const shouldConfigureNewSimulator = !(
            keepRemoteConnection && this.isRemoteOctopusClientConfigured()
        );
        // don't create simulator if client wants to keep remote simulator and the
        // current simulator is a remote simulator
        if (shouldConfigureNewSimulator) {
            try {
                if (connectionParams) {
                    this.createSimulatorConnection(
                        connectionParams.netConnectionSettings,
                        connectionParams.clientSimulator,
                        connectionParams.simulariumFile,
                        connectionParams.geoAssets,
                        connectionParams.requestJson
                    );
                    this.visData.isPlaying = false;
                } else {
                    // caught in following block, not sent to front end
                    throw new Error("incomplete simulator config provided");
                }
            } catch (e) {
                const error = e as Error;
                this.simulator = undefined;
                console.warn(error.message);
                this.visData.isPlaying = false;
            }
        }

        // start the simulation paused and get first frame
        if (this.simulator) {
            return this.start()
                .then(() => {
                    this.resumeStreaming();
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
        newFileName: string,
        keepRemoteConnection = false
    ): Promise<FileReturn> {
        this.cancelCurrentFile(newFileName);
        return this.initNewFile(connectionParams, keepRemoteConnection);
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
            this.configureNetwork(netConnectionConfig);
        }
        if (this.octopusClient) {
            this.octopusClient.setHealthCheckHandler(handler);
            this.octopusClient.checkServerHealth();
        }
    }

    public cancelConversion(): void {
        if (this.octopusClient) {
            this.octopusClient.cancelConversion();
        }
    }

    private setupMetricsCalculator(
        config: NetConnectionParams
    ): RemoteMetricsCalculator {
        const webSocketClient =
            this.remoteWebsocketClient &&
            this.remoteWebsocketClient.socketIsValid()
                ? this.remoteWebsocketClient
                : new WebsocketClient(config, this.onError);
        return new RemoteMetricsCalculator(
            webSocketClient,
            this.onError,
            this.handleMetrics,
            this.handlePlots
        );
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

    public isPlaying(): boolean {
        return this.visData.isPlaying;
    }

    public currentPlaybackHead(): number {
        return this.visData.currentFrameNumber;
    }

    public currentStreamingHead(): number {
        return this.visData.currentStreamingHead;
    }
}

export { SimulariumController };
