import { NetConnection, SimParameters, VisData } from './agentsim';

export default class AgentSimController {
    constructor(netConnectionSettings, params) {
        this.visData = new VisData({});
        this.simParameters = new SimParameters(params);
        this.netConnection = new NetConnection(this.simParameters, this.visData, netConnectionSettings);
    }

    start() {
        this.netConnection.guiStartRemoteTrajectoryPlayback()
    }
    
    stop() {
        this.netConnection.abortRemoteSim()
    }

    pause() {
        this.netConnection.pauseRemoteSim()
    }

    playFromCache() {
        this.netConnection.guiPlayRemoteSimCache()
    }

    resume() {
        this.netConnection.resumeRemoteSim()
    }

    changeFile(newFile) {
        this.simParameters.playBackFile = newFile;
    }
}
