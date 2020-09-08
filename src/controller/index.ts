import jsLogger from "js-logger";
import {
    NetConnection,
    NetConnectionParams,
    VisData,
    VisDataMessage,
    TrajectoryFileInfo,
} from "../simularium";
import {
    SimulariumFileFormat,
    VisDataFrame,
    FileReturn,
    FILE_STATUS_ERROR,
    FILE_STATUS_SUCCESS,
    FILE_STATUS_NO_CHANGE,
    FileStatus,
} from "../simularium/types";

jsLogger.setHandler(jsLogger.createDefaultHandler());

interface SimulariumControllerParams {
    netConnection?: NetConnection;
    netConnectionSettings?: NetConnectionParams;
    trajectoryPlaybackFile?: string;
    trajectoryGeometryFile?: string;
    // a URL prefix to locate the assets in the trajectoryGeometryFile
    assetLocation?: string;
}

const DEFAULT_ASSET_PREFIX =
    "https://aics-agentviz-data.s3.us-east-2.amazonaws.com/meshes/obj";

export default class SimulariumController {
    public netConnection: NetConnection;
    public visData: VisData;
    private networkEnabled: boolean;
    private isPaused: boolean;
    private fileChanged: boolean;
    private playBackFile: string;
    private localFile: boolean;
    // used to map geometry to agent types
    private geometryFile: string;
    // used to locate geometry assets
    private assetPrefix: string;

    public constructor(params: SimulariumControllerParams) {
        this.visData = new VisData();

        if (params.netConnection) {
            this.netConnection = params.netConnection;
        } else {
            this.netConnection = new NetConnection(
                params.netConnectionSettings
            );
        }

        this.playBackFile = params.trajectoryPlaybackFile || "";
        this.netConnection.onTrajectoryDataArrive = this.visData.parseAgentsFromNetData.bind(
            this.visData
        );

        this.networkEnabled = true;
        this.isPaused = false;
        this.fileChanged = false;
        this.localFile = false;
        this.geometryFile = this.resolveGeometryFile(
            params.trajectoryGeometryFile || "",
            this.playBackFile
        );
        this.assetPrefix = params.assetLocation || DEFAULT_ASSET_PREFIX;
    }

    private resolveGeometryFile(
        geometryFile: string,
        playbackFileName: string
    ): string {
        // if we got a geometryFile, assume it's a complete URL
        if (geometryFile) {
            return geometryFile;
        }
        // if there's no geometryFile, then make an assumption about the playbackFileName
        if (playbackFileName) {
            return `https://aics-agentviz-data.s3.us-east-2.amazonaws.com/visdata/${playbackFileName}.json`;
        }
        return "";
    }

    public get hasChangedFile(): boolean {
        return this.fileChanged;
    }

    public get isLocalFile(): boolean {
        return this.localFile;
    }

    public connect(): Promise<string> {
        return this.netConnection.connectToRemoteServer(
            this.netConnection.getIp()
        );
    }

    public start(): Promise<void> {
        // switch back to 'networked' playback
        this.networkEnabled = true;
        this.isPaused = false;
        this.visData.clearCache();

        return this.netConnection.startRemoteTrajectoryPlayback(
            this.playBackFile
        );
    }

    public time(): number {
        return this.visData.currentFrameData.time;
    }

    public stop(): void {
        this.netConnection.abortRemoteSim();
    }

    public pause(): void {
        if (this.networkEnabled) {
            this.netConnection.pauseRemoteSim();
        }

        this.isPaused = true;
    }

    public paused(): boolean {
        return this.isPaused;
    }

    public initializeTrajectoryFile(): void {
        this.netConnection.requestTrajectoryFileInfo(this.playBackFile);
    }

    public gotoTime(timeNs: number): void {
        if (this.visData.hasLocalCacheForTime(timeNs)) {
            this.visData.gotoTime(timeNs);
        } else {
            if (this.networkEnabled) {
                // else reset the local cache,
                //  and play remotely from the desired simulation time
                this.visData.clearCache();
                this.netConnection.gotoRemoteSimulationTime(timeNs);
            }
        }
    }

    public playFromTime(timeNs: number): void {
        this.gotoTime(timeNs);
        this.isPaused = false;
    }

    public resume(): void {
        if (this.networkEnabled) {
            this.netConnection.resumeRemoteSim();
        }

        this.isPaused = false;
    }

    private handleLocalFileChange(
        simulariumFile: SimulariumFileFormat | undefined
    ): Promise<FileReturn> {
        if (!simulariumFile) {
            return Promise.reject({
                status: FILE_STATUS_ERROR,
                message: "No file was detected",
            });
        }
        const { spatialData, trajectoryInfo } = simulariumFile;

        if (!simulariumFile.spatialData) {
            return Promise.reject({
                status: FILE_STATUS_ERROR,
                message: "Simularium files need 'spatialData' array",
            });
        }
        spatialData.bundleData.sort(
            (a: VisDataFrame, b: VisDataFrame): number =>
                a.frameNumber - b.frameNumber
        );

        this.pause();
        this.disableNetworkCommands();
        this.cacheJSON(spatialData);
        this.dragAndDropFileInfo = trajectoryInfo;
        this.netConnection.onTrajectoryFileInfoArrive(this.dragAndDropFileInfo);
        return Promise.resolve({
            status: FILE_STATUS_SUCCESS,
        });
    }

    public changeFile(
        newFileName: string,
        isLocalFile = false,
        simulariumFile?: SimulariumFileFormat,
        geometryFile?: string,
        assetPrefix?: string
    ): Promise<FileReturn> {
        if (newFileName !== this.playBackFile) {
            this.fileChanged = true;
            this.playBackFile = newFileName;
            this.localFile = isLocalFile;
            this.geometryFile = this.resolveGeometryFile(
                geometryFile || "",
                newFileName
            );
            this.assetPrefix = assetPrefix ? assetPrefix : DEFAULT_ASSET_PREFIX;
            this.visData.WaitForFrame(0);
            this.visData.clearCache();

            this.stop();

            if (isLocalFile) {
                return this.handleLocalFileChange(simulariumFile);
            }

            // otherwise, start a network file
            return this.start()
                .then(() => {
                    this.netConnection.requestSingleFrame(0);
                })
                .then(() => ({
                    status: FILE_STATUS_SUCCESS,
                }));
        }

        return Promise.resolve({
            status: FILE_STATUS_NO_CHANGE,
        });
    }

    public markFileChangeAsHandled(): void {
        this.fileChanged = false;
    }

    public getFile(): string {
        return this.playBackFile;
    }

    public getGeometryFile(): string {
        return this.geometryFile;
    }

    public getAssetPrefix(): string {
        return this.assetPrefix;
    }

    public disableNetworkCommands(): void {
        this.networkEnabled = false;

        if (this.netConnection.socketIsValid()) {
            this.netConnection.disconnect();
        }
    }

    public cacheJSON(json: VisDataMessage): void {
        this.visData.cacheJSON(json);
    }

    public clearLocalCache(): void {
        this.visData.clearCache();
    }

    public get dragAndDropFileInfo(): TrajectoryFileInfo {
        return this.visData.dragAndDropFileInfo;
    }
    public set dragAndDropFileInfo(fileInfo: TrajectoryFileInfo) {
        this.visData.dragAndDropFileInfo = fileInfo;
    }
}

export { SimulariumController };
