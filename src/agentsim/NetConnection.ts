import jsLogger from "js-logger";
import { ILogger } from "js-logger/src/types";

interface NetMessage {
    connId: string;
    msgType: number;
}

interface NetMessageType {
    ID_UNDEFINED_WEB_REQUEST: number;
    ID_VIS_DATA_ARRIVE: number;
    ID_VIS_DATA_REQUEST: number;
    ID_VIS_DATA_FINISH: number;
    ID_VIS_DATA_PAUSE: number;
    ID_VIS_DATA_RESUME: number;
    ID_VIS_DATA_ABORT: number;
    ID_UPDATE_TIME_STEP: number;
    ID_UPDATE_RATE_PARAM: number;
    ID_MODEL_DEFINITION: number;
    ID_HEARTBEAT_PING: number;
    ID_HEARTBEAT_PONG: number;
    ID_PLAY_CACHE: number;
    ID_TRAJECTORY_FILE_INFO: number;
    ID_GOTO_SIMULATION_TIME: number;
    ID_INIT_TRAJECTORY_FILE: number;
}

interface PlayBackType {
    ID_LIVE_SIMULATION: number;
    ID_PRE_RUN_SIMULATION: number;
    ID_TRAJECTORY_FILE_PLAYBACK: number;
}

export class NetConnection {
    private webSocket: WebSocket | null;
    private serverIp: string;
    private serverPort: number;
    protected playbackTypes: PlayBackType;
    protected logger: ILogger;
    protected msgTypes: NetMessageType;
    public onTrajectoryFileInfoArrive: Function;
    public onTrajectoryDataArrive: Function;

    public constructor(opts) {
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
        this.logger.setLevel(jsLogger.DEBUG);

        this.onTrajectoryFileInfoArrive = function() {};
        this.onTrajectoryDataArrive = function() {};

        // Frees the reserved backend in the event that the window closes w/o disconnecting
        window.addEventListener("beforeunload", this.onClose.bind(this));
    }

    /**
     * WebSocket State
     */
    private socketIsConnecting(): boolean {
        return (
            this.webSocket !== null &&
            this.webSocket.readyState === this.webSocket.CONNECTING
        );
    }

    public socketIsValid(): boolean {
        return !(
            this.webSocket === null ||
            this.webSocket.readyState === this.webSocket.CLOSED
        );
    }

    private socketIsConnected(): boolean {
        return (
            this.webSocket !== null &&
            this.webSocket.readyState === this.webSocket.OPEN
        );
    }

    /**
     *   Websocket Message Handler
     * */
    protected onMessage(event): void {
        if (!this.socketIsValid()) {
            return;
        }

        const msg: NetMessage = JSON.parse(event.data);
        const msgType = msg.msgType;
        const numMsgTypes = Object.keys(this.msgTypes).length;

        if (msgType > numMsgTypes || msgType < 1) {
            // this suggests either the back-end is out of sync, or a connection to an unknown back-end
            //  either would be very bad
            this.logger.error(
                "Unrecognized web message of type ",
                msg.msgType,
                " arrived"
            );
            return;
        }

        switch (msgType) {
            case this.msgTypes.ID_VIS_DATA_ARRIVE:
                this.onTrajectoryDataArrive(msg);
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
                this.onTrajectoryFileInfoArrive(msg);
                break;
            default:
                this.logger.debug("Web request recieved", msg.msgType);
                break;
        }
    }

    private onOpen(): void {}
    private onClose(): void {}

    /**
     * WebSocket Connect
     * */
    public connectToUri(uri): void {
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

    public disconnect(): void {
        if (!this.socketIsValid()) {
            this.logger.warn("disconnect failed, client is not connected");
            return;
        }

        if (this.webSocket !== null) {
            this.webSocket.close();
        }
    }

    public getIp(): string {
        return `wss://${this.serverIp}:${this.serverPort}/`;
    }

    private connectToUriAsync(address): Promise<string> {
        let connectPromise = new Promise<string>(resolve => {
            this.connectToUri(address);
            resolve("Succesfully connected to uri!");
        });

        return connectPromise;
    }

    public connectToRemoteServer(address: string): Promise<string> {
        let remoteStartPromise = new Promise<string>((resolve, reject) => {
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
    private logWebSocketRequest(whatRequest, jsonData): void {
        this.logger.debug("Web Socket Request Sent: ", whatRequest, jsonData);
    }

    private sendWebSocketRequest(jsonData, requestDescription): void {
        if (this.webSocket !== null) {
            this.webSocket.send(JSON.stringify(jsonData));
        }
        this.logWebSocketRequest(requestDescription, jsonData);
    }

    /**
     * Websocket Update Parameters
     */
    public sendTimeStepUpdate(newTimeStep): void {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: this.msgTypes.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.sendWebSocketRequest(jsonData, "Update Time-Step");
    }

    public sendParameterUpdate(paramName, paramValue): void {
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

    public sendModelDefinition(model): void {
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
    public startRemoteSimPreRun(timeStep, numTimeSteps): void {
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

    public startRemoteSimLive(): void {
        const jsonData = {
            msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
            mode: this.playbackTypes.ID_LIVE_SIMULATION,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendWebSocketRequest(jsonData, "Start Simulation Live");
        });
    }

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
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

    public playRemoteSimCacheFromFrame(cacheFrame): void {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: this.msgTypes.ID_PLAY_CACHE,
            "frame-num": cacheFrame,
        };
        this.sendWebSocketRequest(jsonData, "Play Simulation Cache from Frame");
    }

    public pauseRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: this.msgTypes.ID_VIS_DATA_PAUSE },
            "Pause Simulation"
        );
    }

    public resumeRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: this.msgTypes.ID_VIS_DATA_RESUME },
            "Resume Simulation"
        );
    }

    public abortRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: this.msgTypes.ID_VIS_DATA_ABORT },
            "Abort Simulation"
        );
    }

    public requestSingleFrame(startFrameNumber: number): void {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_VIS_DATA_REQUEST,
                mode: this.playbackTypes.ID_TRAJECTORY_FILE_PLAYBACK,
                frameNumber: startFrameNumber,
            },
            "Request Single Frame"
        );
    }

    public playRemoteSimCacheFromTime(timeNanoSeconds): void {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_PLAY_CACHE,
                time: timeNanoSeconds,
            },
            "Play Simulation Cache from Time"
        );
    }

    public gotoRemoteSimulationTime(timeNanoSeconds: number): void {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_GOTO_SIMULATION_TIME,
                time: timeNanoSeconds,
            },
            "Load single frame at specified Time"
        );
    }

    public requestTrajectoryFileInfo(fileName: string): void {
        this.sendWebSocketRequest(
            {
                msgType: this.msgTypes.ID_INIT_TRAJECTORY_FILE,
                fileName: fileName,
            },
            "Initialize trajectory file info"
        );
    }
}
