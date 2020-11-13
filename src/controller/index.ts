import jsLogger from "js-logger";
import { noop } from "lodash";
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
    FILE_STATUS_SUCCESS,
    FILE_STATUS_FAIL,
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
    public netConnection: NetConnection | undefined;
    public visData: VisData;
    public handleTrajectoryInfo: (TrajectoryFileInfo) => void;
    public postConnect: () => void;
    public resetCamera: () => void;
    public centerCamera: () => void;
    public reOrientCamera: () => void;
    public zoomIn: () => void;
    public zoomOut: () => void;

    public onError?: (errorMessage: string) => void;

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

        this.postConnect = () => {
            /* Do Nothing */
        };

        /* eslint-disable */
        this.handleTrajectoryInfo = (msg: TrajectoryFileInfo) => {
            /* Do Nothing */
        };

        this.reOrientCamera = () => noop;
        this.resetCamera = () => noop;
        this.centerCamera = () => noop;
        this.zoomIn = () => noop;
        this.zoomOut = () => noop;
        this.onError = (errorMessage) => {};
        /* eslint-enable */
        if (params.netConnection || params.netConnectionSettings) {
            this.netConnection = params.netConnection
                ? params.netConnection
                : new NetConnection(params.netConnectionSettings);

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
        } else {
            // No network information was passed in
            //  the viewer will be initialized blank

            this.netConnection = undefined;

            // @TODO: Pass this warning upwards (to installing app)
            if (params.trajectoryPlaybackFile) {
                console.warn(
                    "trajectoryPlaybackFile param ignored, no network config provided"
                );
            }

            this.playBackFile = "";
            this.networkEnabled = false;
            this.isPaused = false;
            this.fileChanged = false;
            this.localFile = true;
            this.geometryFile = "";
        }

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

    public configureNetwork(config: NetConnectionParams): void {
        if (this.netConnection && this.netConnection.socketIsValid()) {
            this.netConnection.disconnect();
        }

        this.netConnection = new NetConnection(config);

        this.netConnection.onTrajectoryDataArrive = this.visData.parseAgentsFromNetData.bind(
            this.visData
        );

        this.netConnection.onTrajectoryFileInfoArrive = (
            trajFileInfo: TrajectoryFileInfo
        ) => {
            this.handleTrajectoryInfo(trajFileInfo);
        };
    }

    public get hasChangedFile(): boolean {
        return this.fileChanged;
    }

    public get isLocalFile(): boolean {
        return this.localFile;
    }

    public connect(): Promise<string> {
        if (!this.netConnection) {
            return Promise.reject(
                "No network connection established in simularium controller."
            );
        }

        return this.netConnection
            .connectToRemoteServer(this.netConnection.getIp())
            .then((msg: string) => {
                this.postConnect();
                return msg;
            });
    }

    public start(): Promise<void> {
        if (!this.netConnection) {
            return Promise.reject();
        }

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
        if (this.netConnection) {
            this.netConnection.abortRemoteSim();
        }
    }

    public pause(): void {
        if (this.networkEnabled && this.netConnection) {
            this.netConnection.pauseRemoteSim();
        }

        this.isPaused = true;
    }

    public paused(): boolean {
        return this.isPaused;
    }

    public initializeTrajectoryFile(): void {
        if (this.netConnection) {
            this.netConnection.requestTrajectoryFileInfo(this.playBackFile);
        }
    }

    public gotoTime(timeNs: number): void {
        if (this.visData.hasLocalCacheForTime(timeNs)) {
            this.visData.gotoTime(timeNs);
        } else {
            if (this.networkEnabled && this.netConnection) {
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
        if (this.networkEnabled && this.netConnection) {
            this.netConnection.resumeRemoteSim();
        }

        this.isPaused = false;
    }

    private handleLocalFileChange(
        simulariumFile: SimulariumFileFormat | undefined
    ): Promise<FileReturn> {
        if (!simulariumFile) {
            const newError = new Error("No file was detected");
            return Promise.reject(newError);
        }
        const { spatialData, trajectoryInfo } = simulariumFile;

        if (!simulariumFile.spatialData) {
            const newError = new Error(
                "Simularium files need 'spatialData' array"
            );
            return Promise.reject(newError);
        }
        spatialData.bundleData.sort(
            (a: VisDataFrame, b: VisDataFrame): number =>
                a.frameNumber - b.frameNumber
        );

        this.pause();
        this.disableNetworkCommands();
        try {
            this.cacheJSON(spatialData);
        } catch (e) {
            return Promise.reject(e);
        }
        try {
            this.dragAndDropFileInfo = trajectoryInfo;

            this.handleTrajectoryInfo(this.dragAndDropFileInfo);
        } catch (e) {
            return Promise.reject(e);
        }
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
        if (this.netConnection) {
            return this.start()
                .then(() => {
                    if (this.netConnection) {
                        this.netConnection.requestSingleFrame(0);
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

        if (this.netConnection && this.netConnection.socketIsValid()) {
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

    public set trajFileInfoCallback(
        callback: (msg: TrajectoryFileInfo) => void
    ) {
        this.handleTrajectoryInfo = callback;

        if (this.netConnection) {
            this.netConnection.onTrajectoryFileInfoArrive = callback;
        }
    }
}

export { SimulariumController };
