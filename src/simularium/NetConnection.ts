import jsLogger from "js-logger";
import { ILogger } from "js-logger";

interface NetMessage {
    connId: string;
    msgType: number;
    fileName: string;
}

interface MessageEventLike {
    data: string;
}

// these have been set to correspond to backend values
export const enum NetMessageEnum {
    ID_UNDEFINED_WEB_REQUEST = 0,
    ID_VIS_DATA_ARRIVE = 1,
    ID_VIS_DATA_REQUEST = 2,
    ID_VIS_DATA_FINISH = 3,
    ID_VIS_DATA_PAUSE = 4,
    ID_VIS_DATA_RESUME = 5,
    ID_VIS_DATA_ABORT = 6,
    ID_UPDATE_TIME_STEP = 7,
    ID_UPDATE_RATE_PARAM = 8,
    ID_MODEL_DEFINITION = 9,
    ID_HEARTBEAT_PING = 10,
    ID_HEARTBEAT_PONG = 11,
    ID_TRAJECTORY_FILE_INFO = 12,
    ID_GOTO_SIMULATION_TIME = 13,
    ID_INIT_TRAJECTORY_FILE = 14,
    // insert new values here before LENGTH
    LENGTH,
}

// these have been set to correspond to backend values
const enum PlayBackType {
    ID_LIVE_SIMULATION = 0,
    ID_PRE_RUN_SIMULATION = 1,
    ID_TRAJECTORY_FILE_PLAYBACK = 2,
    // insert new values here before LENGTH
    LENGTH,
}

export interface NetConnectionParams {
    serverIp?: string;
    serverPort?: number;
}

export class NetConnection {
    private webSocket: WebSocket | null;
    private serverIp: string;
    private serverPort: number;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (NetMessage) => void;
    public onTrajectoryDataArrive: (NetMessage) => void;
    protected lastRequestedFile: string;

    public constructor(opts?: NetConnectionParams) {
        this.webSocket = null;
        this.serverIp = opts && opts.serverIp ? opts.serverIp : "localhost";
        this.serverPort = opts && opts.serverPort ? opts.serverPort : 9002;
        this.lastRequestedFile = "";

        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);

        this.onTrajectoryFileInfoArrive = () => {
            /* do nothing */
        };
        this.onTrajectoryDataArrive = () => {
            /* do nothing */
        };

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
    protected onMessage(event: MessageEvent | MessageEventLike): void {
        if (!this.socketIsValid()) {
            return;
        }

        if (event.data instanceof ArrayBuffer) {
            this.onTrajectoryDataArrive(event.data);
            return;
        }

        const msg: NetMessage = JSON.parse(event.data);
        const msgType = msg.msgType;
        const numMsgTypes = NetMessageEnum.LENGTH;

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
            case NetMessageEnum.ID_VIS_DATA_ARRIVE:
                if (msg.fileName === this.lastRequestedFile) {
                    this.onTrajectoryDataArrive(msg);
                }
                break;
            case NetMessageEnum.ID_UPDATE_TIME_STEP:
                // TODO: callback to handle time step update
                break;
            case NetMessageEnum.ID_UPDATE_RATE_PARAM:
                // TODO: callback to handle rate param
                break;
            case NetMessageEnum.ID_HEARTBEAT_PING:
                this.sendWebSocketRequest(
                    {
                        connId: msg.connId,
                        msgType: NetMessageEnum.ID_HEARTBEAT_PONG,
                    },
                    "Heartbeat pong"
                );
                break;
            case NetMessageEnum.ID_MODEL_DEFINITION:
                this.logger.debug("Model Definition Arrived");
                // TODO: callback to handle model definition
                break;
            case NetMessageEnum.ID_TRAJECTORY_FILE_INFO:
                this.logger.debug("Trajectory file info Arrived");
                this.onTrajectoryFileInfoArrive(msg);
                break;
            default:
                this.logger.debug("Web request recieved", msg.msgType);
                break;
        }
    }

    private onOpen(): void {
        /* do nothing */
    }
    private onClose(): void {
        /* do nothing */
    }

    /**
     * WebSocket Connect
     * */
    public connectToUri(uri: string): void {
        if (this.socketIsValid()) {
            this.disconnect();
        }
        this.webSocket = new WebSocket(uri);
        this.webSocket.binaryType = "arraybuffer";
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
        const connectPromise = new Promise<string>((resolve) => {
            this.connectToUri(address);
            resolve("Successfully connected to uri!");
        });

        return connectPromise;
    }

    public connectToRemoteServer(address: string): Promise<string> {
        const remoteStartPromise = new Promise<string>((resolve, reject) => {
            if (this.socketIsConnected()) {
                return resolve("Remote sim successfully started");
            }

            const startPromise = this.connectToUriAsync(address);
            // wait 1 second for websocket to open
            const waitForIsConnected = () =>
                new Promise((resolve) =>
                    setTimeout(() => {
                        resolve(this.socketIsConnected());
                    }, 1000)
                );

            const handleReturn = async () => {
                const isConnected = await waitForIsConnected();
                secondsWaited++;
                if (isConnected) {
                    resolve("Remote sim successfully started");
                } else if (secondsWaited < TOTAL_WAIT_SECONDS) {
                    return await handleReturn();
                } else if (connectionTries <= MAX_CONNECTION_TRIES) {
                    connectionTries++;
                    return this.connectToUriAsync(address).then(handleReturn);
                } else {
                    reject(
                        new Error(
                            "Failed to connected to requested server, try reloading. If problem keeps occurring check your connection speed"
                        )
                    );
                }
            };
            const TOTAL_WAIT_SECONDS = 2;
            let secondsWaited = 0;
            const MAX_CONNECTION_TRIES = 2;
            let connectionTries = 1;
            return startPromise.then(handleReturn);
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
    public sendTimeStepUpdate(newTimeStep: number): void {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: NetMessageEnum.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.sendWebSocketRequest(jsonData, "Update Time-Step");
    }

    public sendParameterUpdate(paramName: string, paramValue: number): void {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: NetMessageEnum.ID_UPDATE_RATE_PARAM,
            paramName: paramName,
            paramValue: paramValue,
        };
        this.sendWebSocketRequest(jsonData, "Rate Parameter Update");
    }

    public sendModelDefinition(model: string): void {
        if (!this.socketIsValid()) {
            return;
        }

        const dataToSend = {
            model: model,
            msgType: NetMessageEnum.ID_MODEL_DEFINITION,
        };
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
    public startRemoteSimPreRun(timeStep: number, numTimeSteps: number): void {
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_PRE_RUN_SIMULATION,
            timeStep: timeStep,
            numTimeSteps: numTimeSteps,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendWebSocketRequest(jsonData, "Start Simulation Pre-Run");
        });
    }

    public startRemoteSimLive(): void {
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_LIVE_SIMULATION,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendWebSocketRequest(jsonData, "Start Simulation Live");
        });
    }

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
        this.lastRequestedFile = fileName;
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
            "file-name": fileName,
        };

        return this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendWebSocketRequest(
                jsonData,
                "Start Trajectory File Playback"
            );
        });
    }

    public pauseRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: NetMessageEnum.ID_VIS_DATA_PAUSE },
            "Pause Simulation"
        );
    }

    public resumeRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: NetMessageEnum.ID_VIS_DATA_RESUME },
            "Resume Simulation"
        );
    }

    public abortRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendWebSocketRequest(
            { msgType: NetMessageEnum.ID_VIS_DATA_ABORT },
            "Abort Simulation"
        );
    }

    public requestSingleFrame(startFrameNumber: number): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
                mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
                frameNumber: startFrameNumber,
            },
            "Request Single Frame"
        );
    }

    public gotoRemoteSimulationTime(timeNanoSeconds: number): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
                time: timeNanoSeconds,
            },
            "Load single frame at specified Time"
        );
    }

    public requestTrajectoryFileInfo(fileName: string): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
                fileName: fileName,
            },
            "Initialize trajectory file info"
        );
    }
}
