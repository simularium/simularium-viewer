import jsLogger from "js-logger";

interface NetMessage {
    connId: any;
    msgType: any;
}

export class NetConnection {
    private webSocket: any;
    private serverIp: string;
    private serverPort: number;
    private msgTypes: any;
    private playbackTypes: any;
    private logger: any;
    public onTrajectoryFileInfoArrive: any;
    public onTrajectoryDataArrive: any;

    public constructor(opts, loggerLevel) {
        // these have been set to correspond to backend values
        this.playbackTypes = Object.freeze({
            ID_LIVE_SIMULATION: 0,
            ID_PRE_RUN_SIMULATION: 1,
            ID_TRAJECTORY_FILE_PLAYBACK: 2,
        });

        this.webSocket = null;
        this.serverIp = opts.serverIp || "localhost";
        this.serverPort = opts.serverPort || "9002";

        // these have been set to correspond to backend values
        this.msgTypes = Object.freeze({
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
            ID_GOTO_SIMULATION_TIME: 14,
            ID_INIT_TRAJECTORY_FILE: 15,
        });

        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(loggerLevel);

        this.onTrajectoryFileInfoArrive = null;
        this.onTrajectoryDataArrive = null;

        // Frees the reserved backend in the event that the window closes w/o disconnecting
        window.addEventListener("beforeunload", this.onClose.bind(this));
    }

    /**
     * WebSocket State
     */
    private socketIsConnecting() {
        return (
            this.webSocket !== null &&
            this.webSocket.readyState === this.webSocket.CONNECTING
        );
    }

    public socketIsValid() {
        return !(
            this.webSocket === null ||
            this.webSocket.readyState === this.webSocket.CLOSED
        );
    }

    private socketIsConnected() {
        return (
            this.webSocket !== null &&
            this.webSocket.readyState === this.webSocket.OPEN
        );
    }

    /**
     *   Websocket Message Handler
     * */
    private onMessage(event) {
        if (!this.socketIsValid()) {
            return;
        }

        const { logger } = this;
        const msg: NetMessage = JSON.parse(event.data);
        const msgType = msg.msgType;
        const numMsgTypes = Object.keys(this.msgTypes).length;

        if (msgType > numMsgTypes || msgType < 1) {
            // this suggests either the back-end is out of sync, or a connection to an unknown back-end
            //  either would be very bad
            this.logger.console.error(
                "Unrecognized web message of type ",
                msg.msgType,
                " arrived"
            );
            return;
        }
        this.logger.debug("Websocket Message Recieved: ", msg);
        switch (msgType) {
            case this.msgTypes.ID_VIS_DATA_ARRIVE:
                if (this.onTrajectoryDataArrive) {
                    this.onTrajectoryDataArrive(msg);
                }
                break;
            case this.msgTypes.ID_UPDATE_TIME_STEP:
                // TODO: callback to handle time step update
                break;
            case this.msgTypes.ID_UPDATE_RATE_PARAM:
                // TODO: callback to handle rate param
                break;
            case this.msgTypes.ID_HEARTBEAT_PING:
                this.sendWebSocketRequest(
                    {
                        connId: msg.connId,
                        msgType: this.msgTypes.ID_HEARTBEAT_PONG,
                    },
                    "Heartbeat pong"
                );
                break;
            case this.msgTypes.ID_MODEL_DEFINITION:
                this.logger.debug("Model Definition Arrived");
                // TODO: callback to handle model definition
                break;
            case this.msgTypes.ID_TRAJECTORY_FILE_INFO:
                this.logger.debug("Trajectory file info Arrived");
                if (this.onTrajectoryFileInfoArrive) {
                    this.onTrajectoryFileInfoArrive(msg);
                }
                break;
            default:
                this.logger.debug("Web request recieved", msg.msgType);
                break;
        }
    }

    private onOpen() {}
    private onClose() {}

    /**
     * WebSocket Connect
     * */
    public connectToUri(uri) {
        if (this.socketIsValid()) {
            this.disconnect();
        }
        this.webSocket = new WebSocket(uri);
        this.logger.debug("WS Connection Request Sent: ", uri);

        // message handler
        this.webSocket.onopen = this.onOpen.bind(this);
        this.webSocket.onclose = this.onClose.bind(this);
        this.webSocket.onmessage = this.onMessage.bind(this);
    }

    public disconnect() {
        if (!this.socketIsValid()) {
            this.logger.warn("disconnect failed, client is not connected");
            return;
        }

        this.webSocket.close();
    }

    public getIp() {
        return `wss://${this.serverIp}:${this.serverPort}/`;
    }

    private connectToUriAsync(address) {
        let connectPromise = new Promise((resolve, reject) => {
            this.connectToUri(address);
            resolve("Succesfully connected to uri!");
        });

        return connectPromise;
    }

    public connectToRemoteServer(address) {
        let remoteStartPromise = new Promise((resolve, reject) => {
            if (this.socketIsConnected()) {
                return resolve("Remote sim sucessfully started");
            }

            let startPromise = this.connectToUriAsync(address);

            return startPromise.then(() => {
                setTimeout(
                    () => {
                        if (this.socketIsConnected()) {
                            resolve("Remote sim sucessfully started");
                        } else {
                            reject("Failed to connected to requested server");
                        }
                    },
                    1000 // wait 1 second for websocket to open
                );
            });
        });

        return remoteStartPromise;
    }

    /**
     * Websocket Send Helper Functions
     */
    private logWebSocketRequest(whatRequest, jsonData) {
        this.logger.debug("Web Socket Request Sent: ", whatRequest, jsonData);
    }

    private sendWebSocketRequest(jsonData, requestDescription) {
        this.webSocket.send(JSON.stringify(jsonData));
        this.logWebSocketRequest(requestDescription, jsonData);
    }

    /**
     * Websocket Update Parameters
     */
    public sendTimeStepUpdate(newTimeStep) {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: this.msgTypes.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.sendWebSocketRequest(jsonData, "Update Time-Step");
    }

    public sendParameterUpdate(paramName, paramValue) {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: this.msgTypes.ID_UPDATE_RATE_PARAM,
            paramName: paramName,
            paramValue: paramValue,
        };
        this.sendWebSocketRequest(jsonData, "Rate Parameter Update");
    }

    public sendModelDefinition(model) {
        if (!this.socketIsValid()) {
            return;
        }

        const dataToSend = model;
        dataToSend.msgType = this.msgTypes.ID_MODEL_DEFINITION;
        this.sendWebSocketRequest(dataToSend, "Model Definition");
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
    public startRemoteSimPreRun(timeStep, numTimeSteps) {
        const jsonData = {
            msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
            mode: this.playbackTypes.ID_PRE_RUN_SIMULATION,
            timeStep: timeStep,
            numTimeSteps: numTimeSteps,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendWebSocketRequest(jsonData, "Start Simulation Pre-Run");
        });
    }

    public startRemoteSimLive() {
        const jsonData = {
            msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
            mode: this.playbackTypes.ID_LIVE_SIMULATION,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendWebSocketRequest(jsonData, "Start Simulation Live");
        });
    }

    public startRemoteTrajectoryPlayback(fileName) {
        if (!fileName) {
            return;
        }

        const jsonData = {
            msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
            mode: this.playbackTypes.ID_TRAJECTORY_FILE_PLAYBACK,
            "file-name": fileName,
        };

        return this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendWebSocketRequest(
                jsonData,
                "Start Trajectory File Playback"
            );
        });
    }

    public playRemoteSimCacheFromFrame(cacheFrame) {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: this.msgTypes.ID_PLAY_CACHE,
            "frame-num": cacheFrame,
        };
        this.sendWebSocketRequest(jsonData, "Play Simulation Cache from Frame");
    }

    public pauseRemoteSim() {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: this.msgTypes.ID_VIS_DATA_PAUSE },
            "Pause Simulation"
        );
    }

    public resumeRemoteSim() {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: this.msgTypes.ID_VIS_DATA_RESUME },
            "Resume Simulation"
        );
    }

    public abortRemoteSim() {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: this.msgTypes.ID_VIS_DATA_ABORT },
            "Abort Simulation"
        );
    }

    public requestSingleFrame(startFrameNumber) {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
                mode: this.playbackTypes.ID_TRAJECTORY_FILE_PLAYBACK,
                frameNumber: startFrameNumber,
            },
            "Request Single Frame"
        );
    }

    // Loads a single frame nearest to timeNanoSeconds
    //  and sets the client to paused
    public playRemoteSimCacheFromTime(timeNanoSeconds) {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_PLAY_CACHE,
                time: timeNanoSeconds,
            },
            "Play Simulation Cache from Time"
        );
    }

    // Loads a single frame nearest to timeNanoSeconds
    //  and sets the client to paused
    //  effectivley, gets a single frame
    public gotoRemoteSimulationTime(timeNanoSeconds) {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_GOTO_SIMULATION_TIME,
                time: timeNanoSeconds,
            },
            "Load single frame at specified Time"
        );
    }

    // The backend will send a message with information
    //  about the trajectory file specified
    //  this will also initiate loading for the trajectory file
    //  this function should not be called before a websocket connection is established
    public requestTrajectoryFileInfo(fileName) {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_INIT_TRAJECTORY_FILE,
                fileName: fileName,
            },
            "Initialize trajectory file info"
        );
    }
}
