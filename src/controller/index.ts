import jsLogger from "js-logger";
import { NetConnection } from "../agentsim";
import { VisData } from "../agentsim";

jsLogger.setHandler(jsLogger.createDefaultHandler());

export default class AgentSimController {
    public netConnection: NetConnection;
    public visData: any;
    private networkEnabled: boolean;
    private isPaused: boolean;
    private fileChanged: boolean;
    private playBackFile: any;

    public constructor(netConnectionSettings, params) {
        const loggerLevel =
            params.loggerLevel === "debug" ? jsLogger.DEBUG : jsLogger.OFF;
        this.visData = new VisData({});
        this.netConnection = new NetConnection(
            netConnectionSettings,
            loggerLevel
        );

        this.netConnection.onTrajectoryDataArrive = this.visData.parseAgentsFromNetData.bind(
            this.visData
        );

        this.networkEnabled = true;
        this.isPaused = false;
        this.fileChanged = false;
    }

    public get hasChangedFile() {
        return this.fileChanged;
    }

    public connect() {
        return this.netConnection.connectToRemoteServer(
            this.netConnection.getIp()
        );
    }

    public start() {
        // switch back to 'networked' playback
        this.networkEnabled = true;
        this.isPaused = false;
        this.visData.clearCache();

        return this.netConnection.startRemoteTrajectoryPlayback(
            this.playBackFile
        );
    }

    public time() {
        this.visData.time;
    }

    public stop() {
        this.netConnection.abortRemoteSim();
    }

    public pause() {
        if (this.networkEnabled) {
            this.netConnection.pauseRemoteSim();
        }

        this.isPaused = true;
    }

    public paused() {
        return this.isPaused;
    }

    public initializeTrajectoryFile() {
        this.netConnection.requestTrajectoryFileInfo(this.playBackFile);
    }

    public playFromTime(timeNs) {
        // If there is a locally cached frame, use it
        if (this.visData.hasLocalCacheForTime(timeNs)) {
            this.visData.playFromTime(timeNs);
        } else {
            if (this.networkEnabled) {
                // else reset the local cache,
                //  and play remotely from the desired simulation time
                this.visData.clearCache();
                this.netConnection.playRemoteSimCacheFromTime(timeNs);
            }
        }
    }

    public gotoFrameAtTime(timeNs) {
        this.netConnection.gotoRemoteSimulationTime(timeNs);
    }

    public resume() {
        if (this.networkEnabled) {
            this.netConnection.resumeRemoteSim();
        }

        this.isPaused = false;
    }

    public changeFile(newFile) {
        if (newFile !== this.playBackFile) {
            this.fileChanged = true;
            this.playBackFile = newFile;

            this.visData.WaitForFrame(0);
            this.visData.clearCache();

            this.stop();
            const startPromise = this.start();

            if (startPromise) {
                startPromise.then(() => {
                    this.netConnection.requestSingleFrame(0);
                });
            }
        }
    }

    public markFileChangeAsHandled() {
        this.fileChanged = false;
    }

    public getFile() {
        return this.playBackFile;
    }

    public disableNetworkCommands() {
        this.networkEnabled = false;

        if (this.netConnection.socketIsValid()) {
            this.netConnection.disconnect();
        }
    }

    public cacheJSON(json) {
        this.visData.parseAgentsFromNetData(json);
    }

    public clearLocalCache() {
        this.visData.clearCache();
    }
}
