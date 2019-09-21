import { NetConnection, SimParameters, VisData } from "../agentsim";

export default class AgentSimController {
    private netConnection: any;
    private simParameters: any;
    private visData: any;

    public constructor(netConnectionSettings, params) {
        this.visData = new VisData({});
        this.simParameters = new SimParameters(params);
        this.netConnection = new NetConnection(
            this.simParameters,
            this.visData,
            netConnectionSettings
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

    public resume() {
        this.netConnection.resumeRemoteSim();
    }

    public changeFile(newFile) {
        this.simParameters.playBackFile = newFile;
    }

    public getFile() {
        return this.simParameters.playBackFile;
    }
}
