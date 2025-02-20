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
import { OctopusServicesClient } from "../simularium/OctopusClient.js";
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
    octopusClient?: OctopusServicesClient;
    metricsCalculator?: RemoteMetricsCalculator;
    visData: VisData;
    visGeometry: VisGeometry | undefined;
    tickIntervalLength: number;
    handleTrajectoryInfo: (TrajectoryFileInfo: any) => void;
    postConnect: () => void;
    startRecording: () => void;
    stopRecording: () => void;
    onStreamingChange: (streaming: boolean) => void;
    onError?: (error: FrontEndError) => void;
    isFileChanging: boolean;
    streaming: boolean;
    private playBackFile;
    constructor(params: SimulariumControllerParams);
    private createSimulatorConnection;
    configureNetwork(config: NetConnectionParams): void;
    isRemoteOctopusClientConfigured(): boolean;
    get isChangingFile(): boolean;
    setOnStreamingChangeCallback(onStreamingChange: (streaming: boolean) => void): void;
    private handleStreamingChange;
    isStreaming(): boolean;
    connect(): Promise<string>;
    start(): Promise<void>;
    time(): number;
    stop(): void;
    sendUpdate(obj: Record<string, unknown>): void;
    convertTrajectory(netConnectionConfig: NetConnectionParams, dataToConvert: Record<string, unknown>, fileType: TrajectoryType, providedFileName?: string): Promise<void>;
    pauseStreaming(): void;
    paused(): boolean;
    initializeTrajectoryFile(): void;
    startSmoldynSim(netConnectionConfig: NetConnectionParams, fileName: string, smoldynInput: string): Promise<void>;
    private clampFrameNumber;
    private getFrameAtTime;
    movePlaybackFrame(frameNumber: number): void;
    gotoTime(time: number): void;
    playFromTime(time: number): void;
    initalizeStreaming(): void;
    resumeStreaming(startFrame?: number): void;
    pause(): void;
    resume(): void;
    clearFile(): void;
    handleFileChange(simulariumFile: ISimulariumFile, fileName: string, geoAssets?: {
        [key: string]: string;
    }): Promise<FileReturn>;
    cancelCurrentFile(newFileName: string): void;
    initNewFile(connectionParams: SimulatorConnectionParams, keepRemoteConnection?: boolean): Promise<FileReturn>;
    changeFile(connectionParams: SimulatorConnectionParams, newFileName: string, keepRemoteConnection?: boolean): Promise<FileReturn>;
    markFileChangeAsHandled(): void;
    getFile(): string;
    checkServerHealth(handler: () => void, netConnectionConfig: NetConnectionParams): void;
    cancelConversion(): void;
    private setupMetricsCalculator;
    getMetrics(config: NetConnectionParams): Promise<void>;
    getPlotData(config: NetConnectionParams, requestedPlots: PlotConfig[]): Promise<void>;
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
    isPlaying(): boolean;
    currentPlaybackHead(): number;
    currentStreamingHead(): number;
}
export { SimulariumController };
