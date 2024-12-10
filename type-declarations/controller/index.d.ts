import { VisData, RemoteSimulator } from "../simularium/index.js";
import type { NetConnectionParams, TrajectoryFileInfo } from "../simularium/index.js";
import { VisGeometry } from "../visGeometry/index.js";
import { FileReturn, PlotConfig } from "../simularium/types.js";
import { IClientSimulatorImpl } from "../simularium/localSimulators/IClientSimulatorImpl.js";
import { ISimulator } from "../simularium/ISimulator.js";
import { FrontEndError } from "../simularium/FrontEndError.js";
import type { ISimulariumFile } from "../simularium/ISimulariumFile.js";
import { WebsocketClient } from "../simularium/WebsocketClient.js";
import { TrajectoryType } from "../constants.js";
import { RemoteMetricsCalculator } from "../simularium/RemoteMetricsCalculator.js";
interface SimulariumControllerParams {
    remoteSimulator?: RemoteSimulator;
    netConnectionSettings?: NetConnectionParams;
    trajectoryPlaybackFile?: string;
}
interface SimulatorConnectionParams {
    netConnectionSettings?: NetConnectionParams;
    clientSimulator?: IClientSimulatorImpl;
    simulariumFile?: ISimulariumFile;
    geoAssets?: {
        [key: string]: string;
    };
}
export default class SimulariumController {
    simulator?: ISimulator;
    remoteWebsocketClient?: WebsocketClient;
    metricsCalculator?: RemoteMetricsCalculator;
    visData: VisData;
    visGeometry: VisGeometry | undefined;
    tickIntervalLength: number;
    handleTrajectoryInfo: (TrajectoryFileInfo: any) => void;
    postConnect: () => void;
    startRecording: () => void;
    stopRecording: () => void;
    onError?: (error: FrontEndError) => void;
    private networkEnabled;
    private isPaused;
    private isFileChanging;
    private playBackFile;
    constructor(params: SimulariumControllerParams);
    private createSimulatorConnection;
    configureNetwork(config: NetConnectionParams): void;
    get isChangingFile(): boolean;
    connect(): Promise<string>;
    start(): Promise<void>;
    time(): number;
    stop(): void;
    sendUpdate(obj: Record<string, unknown>): void;
    convertTrajectory(netConnectionConfig: NetConnectionParams, dataToConvert: Record<string, unknown>, fileType: TrajectoryType, providedFileName?: string): Promise<void>;
    pause(): void;
    paused(): boolean;
    initializeTrajectoryFile(): void;
    gotoTime(time: number): void;
    playFromTime(time: number): void;
    resume(): void;
    clearFile(): void;
    handleFileChange(simulariumFile: ISimulariumFile, fileName: string, geoAssets?: {
        [key: string]: string;
    }): Promise<FileReturn>;
    changeFile(connectionParams: SimulatorConnectionParams, newFileName: string, keepRemoteConnection?: boolean): Promise<FileReturn>;
    markFileChangeAsHandled(): void;
    getFile(): string;
    checkServerHealth(handler: () => void, netConnectionConfig: NetConnectionParams): void;
    cancelConversion(): void;
    private setupMetricsCalculator;
    getMetrics(config: NetConnectionParams): Promise<void>;
    getPlotData(config: NetConnectionParams, requestedPlots: PlotConfig[]): Promise<void>;
    disableNetworkCommands(): void;
    clearLocalCache(): void;
    set trajFileInfoCallback(callback: (msg: TrajectoryFileInfo) => void);
    /**
     * Camera controls
     * simulariumController.visGeometry gets set in
     * componentDidMount of the viewer, so as long as the dom is mounted
     * these functions will be callable.
     */
    zoomIn(): void;
    zoomOut(): void;
    resetCamera(): void;
    centerCamera(): void;
    reOrientCamera(): void;
    setPanningMode(pan: boolean): void;
    setAllowViewPanning(allow: boolean): void;
    setFocusMode(focus: boolean): void;
    setCameraType(ortho: boolean): void;
}
export { SimulariumController };
