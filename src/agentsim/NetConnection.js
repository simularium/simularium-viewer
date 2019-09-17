import jsLogger from 'js-logger';

class NetConnection {
    constructor(simParameters, visData, opts, loggerLevel) {
    // these have been set to correspond to backend values
        this.playbackTypes = Object.freeze({
            ID_LIVE_SIMULATION: 0,
            ID_PRE_RUN_SIMULATION: 1,
            ID_TRAJECTORY_FILE_PLAYBACK: 2,
        });

        this.webSocket = null;
        this.serverIp = opts.serverIp || '127.0.0.1';
        this.serverPort = opts.serverPort || '9002';
        this.remoteServerName = ""; // only used for cleanup on remote machines
        this.remoteServerSim = ""; // only used for cleanup on remote machines

        // used to get the ip for a back-end to connect to (websockets)
        this.ipServiceAddr = opts.ipServiceAddr || 'http://localhost:5000';

        // if false, will use this.serverIp & this.serverPort above
        this.useIpService = opts.useIpService || false;

        this.webSocketSentString = 'Web Socket Request Sent: ';
        this.mvisData = visData;
        this.msimParameters = simParameters;

        // these have been set to correspond to backend values
        this.mmsgTypes = Object.freeze({
            ID_UNDEFINED_WEB_REQUEST: 0,
            ID_VIS_DATA_ARRIVE: 1,
            ID_VIS_DATA_REQUEST: 2,
            ID_VIS_DATA_FINISH: 3,
            ID_VIS_DATA_PAUSE: 4,
            ID_VIS_DATA_RESUME: 5,
            ID_VIS_DATA_ABORT: 6,
            ID_UPDATE_TIME_STEP: 7,
            ID_UPDATE_RATE_PARAM: 8,
            ID_MODEL_DEFINITION: 9,
            ID_HEARTBEAT_PING: 10,
            ID_HEARTBEAT_PONG: 11,
            ID_PLAY_CACHE: 12,
            ID_TRAJECTORY_FILE_INFO: 13,
        });

        this.mlogger = jsLogger.get('netconnection');
        this.mlogger.setLevel(loggerLevel);

        // Frees the reserved backend in the event that the window closes w/o disconnecting
        window.addEventListener("beforeunload", this.onClose.bind(this));
    }

    get visData() { return this.mvisData; }

    get simParameters() { return this.msimParameters; }

    get msgTypes() { return this.mmsgTypes; }

    get logger() { return this.mlogger; }

    /**
    * WebSocket State
    */
    socketIsConnecting() {
        return this.webSocket !== null
            && this.webSocket.readyState === this.webSocket.CONNECTING;
    }

    socketIsValid() {
        return !(this.webSocket === null
            || this.webSocket.readyState === this.webSocket.CLOSED);
    }

    socketIsConnected() {
        return this.webSocket !== null
            && this.webSocket.readyState === this.webSocket.OPEN;
    }

    /**
    *   Websocket Message Handler
    * */
    onMessage(event) {
        if (!this.owner.socketIsValid()) { return; }

        const { logger } = this.owner;
        const msg = JSON.parse(event.data);
        const msgType = msg.msgType;
        const numMsgTypes = Object.keys(this.owner.msgTypes).length;

        if (msgType > numMsgTypes || msgType < 1) {
            // this suggests either the back-end is out of sync, or a connection to an unknown back-end
            //  either would be very bad
            logger.console.error('Unrecognized web message of type ', msg.msgType, ' arrived');
            return;
        }
        logger.debug('Websocket Message Recieved: ', msg);
        const responseData = {};
        switch (msgType) {
            case this.owner.msgTypes.ID_VIS_DATA_ARRIVE:
                this.owner.visData.parseAgentsFromNetData(msg);
                break;
            case this.owner.msgTypes.ID_UPDATE_TIME_STEP:
                // the timestep has been updated from another client
                this.owner.simParameters.timeStepSliderVal = msg.sliderVal;
                this.owner.simParameters.lastTimeStepSliderVal = msg.sliderVal;
                break;
            case this.owner.msgTypes.ID_UPDATE_RATE_PARAM:
                if ('sliderVal' in msg) {
                    this.owner.simParameters.paramList[msg.paramName].val = msg.sliderVal;
                    this.owner.simParameters.paramListCache[msg.paramName] = msg.sliderVal;
                }
                break;
            case this.owner.msgTypes.ID_HEARTBEAT_PING:
                responseData.msgType = this.owner.msgTypes.ID_HEARTBEAT_PONG;
                responseData.connId = msg.connId;

                this.owner.sendWebSocketRequest(responseData, 'Heartbeat pong');
                break;
            case this.owner.msgTypes.ID_MODEL_DEFINITION:
                logger.debug('Model Definition Arrived');
                this.owner.simParameters.setParametersFromModel(msg);
                break;
            case this.owner.msgTypes.ID_TRAJECTORY_FILE_INFO:
                logger.debug('Trajectory file info Arrived');
                this.owner.simParameters.setTrajectoryFileInfo(msg);
                break;
            default:
                logger.debug('Web request recieved', msg.msgType);
                break;
        }
    }

    onOpen() {
        if(this.useIpService && this.socketIsValid() && this.remoteServerName !== "localhost")
        {
            fetch(
                this.ipServiceAddr + "/assign?command=reserve&name=" +
                this.remoteServerName + "&simulation=" + this.remoteServerSim
            );
        }
    }

    onClose() {
        if(this.useIpService && this.remoteServerName !== "localhost")
        {
            fetch(
                this.ipServiceAddr + "/assign?command=free&name=" +
                this.remoteServerName + "&simulation=none"
            );
        }
    }

    /**
    * WebSocket Connect
    * */
    connect() {
        const uri = `ws://${this.serverIp}:${this.serverPort}/`;
        this.connectToUri(uri);
    }

    connectToUri(uri) {
        if (this.socketIsValid()) { this.disconnect(); }
        this.webSocket = new WebSocket(uri);
        this.logger.debug('WS Connection Request Sent: ', uri);

        // message handler
        this.webSocket.onopen = this.onOpen.bind(this);
        this.webSocket.onclose = this.onClose.bind(this);
        this.webSocket.onmessage = this.onMessage;
        this.webSocket.owner = this;
    }

    setServerName(name)
    {
        this.remoteServerName = name;
    }

    disconnect() {
        if (!this.socketIsValid()) {
            this.logger.warn('disconnect failed, client is not connected');
            return;
        }

        this.webSocket.close();
    }

    getIp() {
        return `ws://${this.serverIp}:${this.serverPort}/`
    }

    requestServerInfo(queryParams) {
        let ipFetch = fetch(
            this.ipServiceAddr + "/get?" + queryParams,
            {cache: "no-store"}
        );

        const localServer = {
            ip: "127.0.0.1:9002",
            name: "localhost"
        };

        return ipFetch.then((response) => {
            if (response.ok) {
                return response.json().then((data) => {
                    return Object.keys(data).length > 0 ?
                        data[0] : localServer;
                });
            } else {
                return localServer;
            }
        }).catch(function() {
            return localServer;
        });
    }

    connectToUriAsync(address) {
        let connectPromise = new Promise((resolve, reject) => {
            this.connectToUri(address);
            resolve("Succesfully connected to uri!");
        });

        return connectPromise;
    }

    // queryParams are HTTP query parameters describing the desired server
    //  e.g. state=free&simulation=coolsim
    connectUsingIpServiceAsync(queryParams) {
        let connectPromise = this.requestServerInfo(queryParams);
        return connectPromise.then((jsonData) => {
            if(!this.socketIsValid())
            {
                this.connectToUri('ws://' + jsonData.ip)
                this.setServerName(jsonData.name);
            }
        });
    }

    StartRemoteSimulationAsync(queryParams, jsonData, description)
    {
        let remoteStartPromise = new Promise((resolve, reject) => {
            if(this.socketIsConnected())
            {
                this.sendWebSocketRequest(jsonData, description);
                resolve("Remote sim sucessfully started");
                return;
            }

            let startPromise = this.useIpService ?
                this.connectUsingIpServiceAsync(queryParams) :
                this.connectToUriAsync(this.getIp());

            return startPromise.then(() => {
                setTimeout(
                    () => {
                        if(this.socketIsConnected())
                        {
                            this.sendWebSocketRequest(jsonData, description);
                            resolve("Remote sim sucessfully started");
                        }
                        else {
                            reject("Failed to connected to requested server");
                        }
                    }, 1000 // wait 1 second for websocket to open
                );
            });
        });

        return remoteStartPromise;
    }

    /**
    * Websocket Send Helper Functions
    */
    logWebSocketRequest(whatRequest, jsonData) {
        this.logger.debug(this.webSocketSentString, whatRequest, jsonData);
    }

    sendWebSocketRequest(jsonData, requestDescription) {
        this.webSocket.send(JSON.stringify(jsonData));
        this.logWebSocketRequest(requestDescription, jsonData);
    }

    /**
    * Websocket Update Parameters
    */
    sendTimeStepUpdate(newTimeStep, sliderVal) {
        if (!this.socketIsValid()) { return; }

        const jsonData = {
            msgType: this.msgTypes.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
            sliderVal: sliderVal,
        };
        this.sendWebSocketRequest(jsonData, 'Update Time-Step');
    }

    sendParameterUpdate(paramName, paramValue, sliderVal) {
        if (!this.socketIsValid()) { return; }

        const jsonData = {
            msgType: this.msgTypes.ID_UPDATE_RATE_PARAM,
            paramName: paramName,
            paramValue: paramValue,
            sliderVal: sliderVal,
        };
        this.sendWebSocketRequest(jsonData, 'Rate Parameter Update');
    }

    sendModelDefinition(model) {
        if (!this.socketIsValid()) { return; }

        const dataToSend = model;
        dataToSend.msgType = this.msgTypes.ID_MODEL_DEFINITION;
        this.sendWebSocketRequest(dataToSend, 'Model Definition');
    }

    /**
    * WebSocket Simulation Control
    *
    * Simulation Run Modes:
    *  Live : Results are sent as they are calculated
    *  Pre-Run : All results are evaluated, then sent piecemeal
    *  Trajectory File: No simulation run, stream a result file piecemeal
    *
    */
    startRemoteSimPreRun(timeStep, numTimeSteps) {
        const jsonData = {
            msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
            mode: this.playbackTypes.ID_PRE_RUN_SIMULATION,
            "timeStep": timeStep,
            "numTimeSteps": numTimeSteps,
        };

        this.StartRemoteSimulationAsync("state=free", jsonData, "Start Simulation Pre-Run");
    }

    startRemoteSimLive() {
        const jsonData = {
            msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
            mode: this.playbackTypes.ID_LIVE_SIMULATION,
        };

        this.StartRemoteSimulationAsync("state=free", jsonData, "Start Simulation Live");
    }

    startRemoteTrajectoryPlayback(fileName) {
        if (!fileName) {
            return;
        }

        const jsonData = {
            msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
            mode: this.playbackTypes.ID_TRAJECTORY_FILE_PLAYBACK,
            "file-name": fileName,
        };

        this.remoteServerSim = fileName;
        this.StartRemoteSimulationAsync(
            "simulation=" + fileName,
            jsonData,
            "Start Trajectory File Playback"
        ).catch(() => {
            // if failed to find a remote server running the desired simulation,
            //  request a new one
            if(this.useIpService) {
                this.StartRemoteSimulationAsync(
                    "state=free",
                    jsonData,
                    "Start Trajectory File Playback"
                );
            }

            // if the ip service is not being used, a second request won't change
            //  the result
        }
        );
    }

    playRemoteSimCacheFromFrame(cacheFrame) {
        if (!this.socketIsValid()) { return; }

        const jsonData = {
            msgType: this.msgTypes.ID_PLAY_CACHE,
            'frame-num': cacheFrame,
        };
        this.sendWebSocketRequest(jsonData, 'Play Simulation Cache from Frame');
    }

    pauseRemoteSim() {
        if (!this.socketIsValid()) { return; }
        this.sendWebSocketRequest({ msgType: this.msgTypes.ID_VIS_DATA_PAUSE }, 'Pause Simulation');
    }

    resumeRemoteSim() {
        if (!this.socketIsValid()) { return; }
        this.sendWebSocketRequest({ msgType: this.msgTypes.ID_VIS_DATA_RESUME }, 'Resume Simulation');
    }

    abortRemoteSim() {
        if (!this.socketIsValid()) { return; }
        this.sendWebSocketRequest({ msgType: this.msgTypes.ID_VIS_DATA_ABORT }, 'Abort Simulation');
        this.disconnect();
    }

    requestSingleFrame(startFrameNumber = 0) {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
                count: 1,
                frameNumber: startFrameNumber
            },
            "Request Single Frame"
        );
    }

    playRemoteSimCacheFromTime(timeNanoSeconds) {
        console.log(timeNanoSeconds);
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_PLAY_CACHE,
                time: timeNanoSeconds
            },
            "Play Simulation Cache from Time"
        );
    }

    /**
    * GUI Remote Sim Functions
    */
    guiStartRemoteSimPreRun() {
        this.startRemoteSimPreRun(
            this.simParameters.preRunTimeStep,
            this.simParameters.preRunNumTimeSteps,
        );

        this.simParameters.newSimulationIsRunning = true;
    }

    guiStartRemoteSimLive() {
        this.startRemoteSimLive();
        this.simParameters.newSimulationIsRunning = true;
    }

    guiStartRemoteTrajectoryPlayback() {
        this.startRemoteTrajectoryPlayback(
            this.simParameters.trajectoryPlaybackFile,
        );
        this.simParameters.newSimulationIsRunning = true;
    }

    guiPlayRemoteSimCache(frameNumber) {
        const frame = frameNumber || this.simParameters.cachePlaybackFrame
        this.playRemoteSimCacheFromFrame(
            frame
        );
    }

    /**
    *   Check for parameter updates (that need to be sent to backend)
    * */
    checkForUpdates() {
        if (this.simParameters) {
            let updates = this.simParameters.getRateParameterUpdates();
            Object.keys(updates).forEach((paramName) => {
                this.sendParameterUpdate(
                    paramName,
                    updates[paramName].val,
                    updates[paramName]['sliderVal'],
                );
            });

            updates = this.simParameters.getTimeStepUpdate();
            if (Object.keys(updates).length !== 0 || updates.constructor !== Object) {
                this.logger.debug('Time step update found:', updates);
                this.sendTimeStepUpdate(
                    updates.val,
                    updates['sliderVal'],
                );
            }
        }
    }
}

export { NetConnection };
export default NetConnection;
