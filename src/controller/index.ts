import { NetConnection, SimParameters, VisData } from "../agentsim";
import jsLogger from "js-logger";

jsLogger.setHandler(jsLogger.createDefaultHandler());

export default class AgentSimController {
    public netConnection: any;
    public simParameters: any;
    public visData: any;

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
    }

    public start() {
        this.netConnection.guiStartRemoteTrajectoryPlayback();
    }

    public time() {
        this.visData.time;
    }

    public stop() {
        this.netConnection.abortRemoteSim();
    }

    public pause() {
        this.netConnection.pauseRemoteSim();
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
        this.netConnection.playRemoteSimCacheFromTime(timeNs);
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
        this.netConnection.resumeRemoteSim();
    }

    public changeFile(newFile) {
        this.simParameters.playBackFile = newFile;
    }

    public getFile() {
        return this.simParameters.playBackFile;
    }

    public renderFromJSON(json) {
        this.visData.parseAgentsFromNetData(json);
    }
}
