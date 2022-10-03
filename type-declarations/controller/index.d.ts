import { RemoteSimulator, NetConnectionParams, VisData, VisDataMessage, TrajectoryFileInfo } from "../simularium";
import { VisGeometry } from "../visGeometry";
import { FileReturn } from "../simularium/types";
import { IClientSimulatorImpl } from "../simularium/localSimulators/IClientSimulatorImpl";
import { ISimulator } from "../simularium/ISimulator";
import { FrontEndError } from "../simularium/FrontEndError";
import type { ISimulariumFile } from "../simularium/ISimulariumFile";
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
    visData: VisData;
    visGeometry: VisGeometry | undefined;
    tickIntervalLength: number;
    handleTrajectoryInfo: (TrajectoryFileInfo: any) => void;
    postConnect: () => void;
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
    pause(): void;
    paused(): boolean;
    initializeTrajectoryFile(): void;
    gotoTime(time: number): void;
    playFromTime(time: number): void;
    resume(): void;
    clearFile(): void;
    changeFile(connectionParams: SimulatorConnectionParams, newFileName: string): Promise<FileReturn>;
    markFileChangeAsHandled(): void;
    getFile(): string;
    disableNetworkCommands(): void;
    cacheJSON(json: VisDataMessage): void;
    clearLocalCache(): void;
    get dragAndDropFileInfo(): TrajectoryFileInfo | null;
    set dragAndDropFileInfo(fileInfo: TrajectoryFileInfo | null);
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
    setFocusMode(focus: boolean): void;
}
export { SimulariumController };
