import jsLogger from "js-logger";
import { isEmpty, noop } from "lodash";
import { VisData, RemoteSimulator } from "../simularium";
import type {
    NetConnectionParams,
    TrajectoryFileInfo,
    VisDataMessage,
} from "../simularium";
import { VisGeometry } from "../visGeometry";
import {
    FileReturn,
    FILE_STATUS_SUCCESS,
    FILE_STATUS_FAIL,
    PlotConfig,
} from "../simularium/types";

import { ClientSimulator } from "../simularium/ClientSimulator";
import { IClientSimulatorImpl } from "../simularium/localSimulators/IClientSimulatorImpl";
import { ISimulator } from "../simularium/ISimulator";
import { LocalFileSimulator } from "../simularium/LocalFileSimulator";
import { FrontEndError } from "../simularium/FrontEndError";
import type { ISimulariumFile } from "../simularium/ISimulariumFile";
import { WebsocketClient } from "../simularium/WebsocketClient";
import { TrajectoryType } from "../constants";
import { RemoteMetricsCalculator } from "../simularium/RemoteMetricsCalculator";

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
}

export default class SimulariumController {
    public simulator?: ISimulator;
    public remoteWebsocketClient?: WebsocketClient;
    public metricsCalculator?: RemoteMetricsCalculator;
    public visData: VisData;
    public visGeometry: VisGeometry | undefined;
    public tickIntervalLength: number;
    public handleTrajectoryInfo: (TrajectoryFileInfo) => void;
    public postConnect: () => void;
    public onError?: (error: FrontEndError) => void;

    private networkEnabled: boolean;
    private isPaused: boolean;
    private isFileChanging: boolean;
    private playBackFile: string;

    public constructor(params: SimulariumControllerParams) {
        this.visData = new VisData();
        this.tickIntervalLength = 0; // Will be overwritten when a trajectory is loaded
        this.postConnect = () => noop;

        this.handleTrajectoryInfo = (/*msg: TrajectoryFileInfo*/) => noop;
        this.onError = (/*errorMessage*/) => noop;

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

        this.networkEnabled = true;
        this.isPaused = false;
        this.isFileChanging = false;
        this.playBackFile = params.trajectoryPlaybackFile || "";
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.resetCamera = this.resetCamera.bind(this);
        this.centerCamera = this.centerCamera.bind(this);
        this.reOrientCamera = this.reOrientCamera.bind(this);
        this.setPanningMode = this.setPanningMode.bind(this);
        this.setFocusMode = this.setFocusMode.bind(this);
        this.convertAndLoadTrajectory =
            this.convertAndLoadTrajectory.bind(this);
        this.setCameraType = this.setCameraType.bind(this);
    }

    private createSimulatorConnection(
        netConnectionConfig?: NetConnectionParams,
        clientSimulator?: IClientSimulatorImpl,
        localFile?: ISimulariumFile,
        geoAssets?: { [key: string]: string }
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
                this.visData.parseAgentsFromLocalFileData.bind(this.visData)
            );
        } else if (netConnectionConfig) {
            const webSocketClient = new WebsocketClient(
                netConnectionConfig,
                this.onError
            );
            this.remoteWebsocketClient = webSocketClient;
            this.simulator = new RemoteSimulator(
                webSocketClient,
                !!netConnectionConfig.useOctopus,
                this.onError
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

    public configureNetwork(config: NetConnectionParams): void {
        if (this.simulator && this.simulator.socketIsValid()) {
            this.simulator.disconnect();
        }

        this.createSimulatorConnection(config);
    }

    public get isChangingFile(): boolean {
        return this.isFileChanging;
    }

    // Not called by viewer, but could be called by
    // parent app
    public connect(): Promise<string> {
        if (!this.simulator) {
            return Promise.reject(
                new Error(
                    "No network connection established in simularium controller."
                )
            );
        }

        return this.simulator
            .connectToRemoteServer(this.simulator.getIp())
            .then((msg: string) => {
                this.postConnect();
                return msg;
            });
    }

    public start(): Promise<void> {
        if (!this.simulator) {
            return Promise.reject();
        }

        // switch back to 'networked' playback
        this.networkEnabled = true;
        this.isPaused = false;
        this.visData.clearCache();

        return this.simulator.startRemoteTrajectoryPlayback(this.playBackFile);
    }

    public time(): number {
        return this.visData.currentFrameData.time;
    }

    public stop(): void {
        if (this.simulator) {
            this.simulator.abortRemoteSim();
        }
    }

    public sendUpdate(obj: Record<string, unknown>): void {
        if (this.simulator) {
            this.simulator.sendUpdate(obj);
        }
    }

    public convertAndLoadTrajectory(
        netConnectionConfig: NetConnectionParams,
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType
    ): Promise<void> {
        try {
            if (
                !(this.simulator && this.simulator.isConnectedToRemoteServer())
            ) {
                // Only configure network if we aren't already connected to the remote server
                this.configureNetwork(netConnectionConfig);
            }
            if (!(this.simulator instanceof RemoteSimulator)) {
                throw new Error("Autoconversion requires a RemoteSimulator");
            }
        } catch (e) {
            return Promise.reject(e);
        }

        return this.simulator
            .convertTrajectory(dataToConvert, fileType)
            .then(() => {
                if (this.simulator) {
                    this.simulator.requestSingleFrame(0);
                }
            });
    }

    public pause(): void {
        if (this.networkEnabled && this.simulator) {
            this.simulator.pauseRemoteSim();
        }

        this.isPaused = true;
    }

    public paused(): boolean {
        return this.isPaused;
    }

    public initializeTrajectoryFile(): void {
        if (this.simulator) {
            this.simulator.requestTrajectoryFileInfo(this.playBackFile);
        }
    }

    public gotoTime(time: number): void {
        // If in the middle of changing files, ignore any gotoTime requests
        if (this.isFileChanging === true) return;
        if (this.visData.hasLocalCacheForTime(time)) {
            this.visData.gotoTime(time);
        } else {
            if (this.networkEnabled && this.simulator) {
                // else reset the local cache,
                //  and play remotely from the desired simulation time
                this.visData.clearCache();

                // Instead of requesting from the backend the `time` passed into this
                // function, we request (time - firstFrameTime) because the backend
                // currently assumes the first frame of every trajectory is at time 0.
                //
                // TODO: Long term, we should decide on a better way to deal with this
                // assumption: remove assumption from backend, perform this normalization
                // in simulariumio, or something else? One way might be to require making
                // firstFrameTime a part of TrajectoryFileInfo.
                let firstFrameTime = this.visData.firstFrameTime;
                if (firstFrameTime === null) {
                    console.error(
                        "VisData does not contain firstFrameTime, defaulting to 0"
                    );
                    firstFrameTime = 0;
                }
                this.simulator.gotoRemoteSimulationTime(time - firstFrameTime);
            }
        }
    }

    public playFromTime(time: number): void {
        this.gotoTime(time);
        this.isPaused = false;
    }

    public resume(): void {
        if (this.networkEnabled && this.simulator) {
            this.simulator.resumeRemoteSim();
        }

        this.isPaused = false;
    }

    public clearFile(): void {
        this.isFileChanging = false;
        this.playBackFile = "";
        this.visData.clearForNewTrajectory();
        this.disableNetworkCommands();
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

    public changeFile(
        connectionParams: SimulatorConnectionParams,
        // TODO: push newFileName into connectionParams
        newFileName: string
    ): Promise<FileReturn> {
        this.isFileChanging = true;
        this.playBackFile = newFileName;

        if (this.simulator instanceof RemoteSimulator) {
            this.simulator.handleError = () => noop;
        }

        this.visData.WaitForFrame(0);
        this.visData.clearForNewTrajectory();
        this.visData.cancelAllWorkers();

        this.stop();

        // Do I still need this? test...
        // if (this.simulator) {
        //     this.simulator.disconnect();
        // }

        try {
            if (connectionParams) {
                this.createSimulatorConnection(
                    connectionParams.netConnectionSettings,
                    connectionParams.clientSimulator,
                    connectionParams.simulariumFile,
                    connectionParams.geoAssets
                );
                this.networkEnabled = true; // This confuses me, because local files also go through this code path
                this.isPaused = true;
            } else {
                // caught in following block, not sent to front end
                throw new Error("incomplete simulator config provided");
            }
        } catch (e) {
            const error = e as Error;
            this.simulator = undefined;
            console.warn(error.message);
            this.networkEnabled = false;
            this.isPaused = false;
        }

        // start the simulation paused and get first frame
        if (this.simulator) {
            return this.start()
                .then(() => {
                    if (this.simulator) {
                        this.simulator.requestSingleFrame(0);
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
        if (!(this.simulator && this.simulator.isConnectedToRemoteServer())) {
            // Only configure network if we aren't already connected to the remote server
            this.configureNetwork(netConnectionConfig);
        }
        if (this.simulator instanceof RemoteSimulator) {
            this.simulator.setHealthCheckHandler(handler);
            this.simulator.checkServerHealth();
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

    public disableNetworkCommands(): void {
        this.networkEnabled = false;

        if (this.simulator && this.simulator.socketIsValid()) {
            this.simulator.disconnect();
        }
    }

    public cacheJSON(json: VisDataMessage): void {
        this.visData.cacheJSON(json);
    }

    public clearLocalCache(): void {
        this.visData.clearCache();
    }

    public get dragAndDropFileInfo(): TrajectoryFileInfo | null {
        return this.visData.dragAndDropFileInfo;
    }
    public set dragAndDropFileInfo(fileInfo: TrajectoryFileInfo | null) {
        this.visData.dragAndDropFileInfo = fileInfo;
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
