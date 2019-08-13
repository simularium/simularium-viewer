import { VisGeometry } from './agentsim/VisGeometry';
import { NetConnection } from './agentsim/NetConnection';
import { SimParameters } from './agentsim/SimParameters';
import  VisData  from './agentsim/VisData';
import { ThreadUtil } from './agentsim/ThreadUtil';
import { DevGUI } from './agentsim/DevGUI';

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
}

export {
    VisGeometry,
    NetConnection,
    SimParameters,
    VisData,
    ThreadUtil,
    DevGUI
}