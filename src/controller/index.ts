import { NetConnection, SimParameters, VisData } from "../agentsim";
import jsLogger from "js-logger";

jsLogger.setHandler(jsLogger.createDefaultHandler());

export default class AgentSimController {
    public netConnection: any;
    public simParameters: any;
    public visData: any;
    private networkEnabled: boolean;
    private isPaused: boolean;
    private mhasChangedFile: boolean;

    public constructor(netConnectionSettings, params) {
        const loggerLevel =
            params.loggerLevel === "debug" ? jsLogger.DEBUG : jsLogger.OFF;
        this.visData = new VisData({});
        this.simParameters = new SimParameters(params);
        this.netConnection = new NetConnection(
            this.simParameters,
            this.visData,
            netConnectionSettings,
            loggerLevel
        );

        this.networkEnabled = true;
        this.isPaused = false;
        this.mhasChangedFile = false;
    }

    public start() {
        // switch back to 'networked' playback
        this.networkEnabled = true;
        this.isPaused = false;
        this.visData.clearCache();

        return this.netConnection.guiStartRemoteTrajectoryPlayback();
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
        } else {
            this.isPaused = true;
        }
    }

    public paused() {
        return this.isPaused;
    }

    public connect() {
        return this.netConnection.guiConnect();
    }

    public numberOfFrames() {
        return this.simParameters.numberOfCacheFrames;
    }

    public timeStepSize() {
        return this.simParameters.cacheTimeStepSize;
    }

    public initializeTrajectoryFile() {
        this.netConnection.guiRequestTrajectoryInfo();
    }

    public playFromFrame(frameNumber) {
        this.netConnection.playRemoteSimCacheFromFrame(frameNumber);
    }

    public playFromTime(timeNs) {
        // If there is a locally cached frame, use it
        if (this.visData.hasLocalCacheForTime(timeNs)) {
            this.visData.playFromTime(timeNs);
            // @TODO: Does the networked state need to change? (need an explicit play command?)
        } else {
            if (this.networkEnabled) {
                // else reset the local cache,
                //  and play remotely from the desired simulation time
                this.visData.clearCache();
                this.netConnection.playRemoteSimCacheFromTime(timeNs);
            }
        }
    }

    public playOneFrame(frameNumber) {
        this.netConnection.requestSingleFrame(frameNumber);
    }

    public gotoFrameAtTime(timeNs) {
        this.netConnection.gotoRemoteSimulationTime(timeNs);
    }

    public gotoNextFrame() {
        this.netConnection.gotoNextFrame();
    }

    public gotoPreviousFrame() {
        this.netConnection.gotoPreviousFrame();
    }

    public resume() {
        if (this.networkEnabled) {
            this.netConnection.resumeRemoteSim();
        } else {
            this.isPaused = false;
        }
    }

    public changeFile(newFile) {
        if (newFile !== this.simParameters.playBackFile) {
            this.mhasChangedFile = true;
            this.simParameters.playBackFile = newFile;
            this.stop();
            let startPromise = this.start();

            startPromise.then(() => {
                this.playOneFrame(0);
            });
        }
    }

    public hasChangedFile() {
        return this.mhasChangedFile;
    }

    public handleChangedFile() {
        this.mhasChangedFile = false;
    }

    public getFile() {
        return this.simParameters.playBackFile;
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
