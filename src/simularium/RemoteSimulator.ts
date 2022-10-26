import jsLogger from "js-logger";
import { ILogger } from "js-logger";
import { FrontEndError, ErrorLevel } from "./FrontEndError";

import { ISimulator } from "./ISimulator";
import { TrajectoryFileInfoV2, VisDataMessage } from "./types";

interface NetMessage {
    connId: string;
    msgType: number;
    fileName: string;
}
// TODO: proposed new NetMessage data type:
// This factors the raw data structure away from the networking and transmission info.
// This allows the data structure to make a bit more sense with respect to typescript typing,
// and also for raw file drag n drop it doesn't need connection info or msgtype.
// interface NetMessage {
//     connId: string; // unique connection to server
//     msgType: number; // identifies the data structure of the message
//     fileName: string; // identifies the trajectory this connection is dealing with
//     payload: Object; // the JS object with the message data itself
// }

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
    ID_UPDATE_SIMULATION_STATE = 15,
    ID_CONVERT_TRAJECTORY_FILE = 16,
    ID_CONVERTED_TRAJECTORY = 17,
    ID_CALCULATE_METRICS = 18,
    ID_METRICS_PLOT_DATA = 19,
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

export const CONNECTION_SUCCESS_MSG = "Remote sim successfully started";
export const CONNECTION_FAIL_MSG =
    "Failed to connect to server; try reloading. If the problem persists, there may be a problem with your connection speed or the server might be too busy.";

export interface NetConnectionParams {
    serverIp?: string;
    serverPort?: number;
}

// a RemoteSimulator is a ISimulator that connects to the Simularium Engine
// back end server and plays back a trajectory specified in the NetConnectionParams
export class RemoteSimulator implements ISimulator {
    private webSocket: WebSocket | null;
    private serverIp: string;
    private serverPort: number;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (NetMessage) => void;
    public onTrajectoryDataArrive: (NetMessage) => void;
    protected lastRequestedFile: string;
    public connectionTimeWaited: number;
    public connectionRetries: number;
    public handleError: (error: FrontEndError) => void | (() => void);

    public constructor(
        opts?: NetConnectionParams,
        errorHandler?: (error: FrontEndError) => void
    ) {
        this.webSocket = null;
        this.serverIp = opts && opts.serverIp ? opts.serverIp : "localhost";
        this.serverPort = opts && opts.serverPort ? opts.serverPort : 9002;
        this.connectionTimeWaited = 0;
        this.connectionRetries = 0;
        this.lastRequestedFile = "";
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });

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

    public setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfoV2) => void
    ): void {
        this.onTrajectoryFileInfoArrive = handler;
    }
    public setTrajectoryDataHandler(
        handler: (msg: VisDataMessage) => void
    ): void {
        this.onTrajectoryDataArrive = handler;
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
        // where we receive websocket messages
        if (!this.socketIsValid()) {
            return;
        }

        if (event.data instanceof ArrayBuffer) {
            const floatView = new Float32Array(event.data);
            const binaryMsgType = floatView[0];

            if (binaryMsgType === NetMessageEnum.ID_VIS_DATA_ARRIVE) {
                const OFFSET_TO_NAME_LENGTH = 8;
                const nameLength = floatView[1];
                const byteView = new Uint8Array(event.data);
                const fileBytes = byteView.subarray(
                    OFFSET_TO_NAME_LENGTH,
                    OFFSET_TO_NAME_LENGTH + nameLength
                );
                const fileName = new TextDecoder("utf-8").decode(fileBytes);

                if (fileName == this.lastRequestedFile) {
                    this.onTrajectoryDataArrive(event.data);
                } else {
                    this.logger.error(
                        "File arrived ",
                        fileName,
                        " is not file ",
                        this.lastRequestedFile
                    );
                }
            } else {
                this.logger.error(
                    "Unexpected binary message arrived of type ",
                    binaryMsgType
                );
            }
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
            case NetMessageEnum.ID_CONVERTED_TRAJECTORY:
                this.logger.debug("Converted file arrived");
            // handle incoming data (something like this.loadFile)
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
    public createWebSocket(uri: string): void {
        // Create and initialize a WebSocket object

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

    public async waitForWebSocket(timeout: number): Promise<boolean> {
        // Wait a specified time then check WebSocket status
        return new Promise((resolve) =>
            setTimeout(() => {
                resolve(this.socketIsConnected());
            }, timeout)
        );
    }

    public async checkConnection(
        address: string,
        timeout = 1000,
        maxRetries = 1
    ): Promise<boolean> {
        // Check if the WebSocket becomes connected within an allotted amount
        // of time and number of retries.

        // Initially wait for a max wait time of maxWaitTime, then retry
        // connecting <maxRetries> time(s). In a retry, only wait for the
        // amount of time specified as timeout.

        const maxWaitTime = 4 * timeout;

        const isConnected = await this.waitForWebSocket(timeout);
        this.connectionTimeWaited += timeout;

        if (isConnected) {
            return true;
        } else if (this.connectionTimeWaited < maxWaitTime) {
            return this.checkConnection(address, timeout);
        } else if (this.connectionRetries < maxRetries) {
            this.createWebSocket(address);
            this.connectionRetries++;
            return this.checkConnection(address, timeout);
        } else {
            return false;
        }
    }

    public async connectToRemoteServer(address: string): Promise<string> {
        this.connectionTimeWaited = 0;
        this.connectionRetries = 0;

        if (this.socketIsConnected()) {
            return CONNECTION_SUCCESS_MSG;
        }

        this.createWebSocket(address);
        const isConnectionSuccessful = await this.checkConnection(address);

        if (isConnectionSuccessful) {
            return CONNECTION_SUCCESS_MSG;
        } else {
            // caught by functions that call this
            throw new Error(CONNECTION_FAIL_MSG);
        }
    }

    /**
     * Websocket Send Helper Functions
     */
    private logWebSocketRequest(whatRequest, jsonData): void {
        this.logger.debug("Web Socket Request Sent: ", whatRequest, jsonData);
    }

    private sendWebSocketRequest(jsonData, requestDescription: string): void {
        if (this.socketIsValid()) {
            if (this.webSocket !== null) {
                this.webSocket.send(JSON.stringify(jsonData));
            }
            this.logWebSocketRequest(requestDescription, jsonData);
        } else {
            console.error(
                "Request to server cannot be made with a closed Websocket connection."
            );
            this.handleError(
                new FrontEndError(
                    "Connection to server is closed; please try reloading. If the problem persists, the server may be too busy. Please try again at another time.",
                    ErrorLevel.ERROR
                )
            );
        }
    }

    /**
     * Websocket Update Parameters
     */
    public sendTimeStepUpdate(newTimeStep: number): void {
        const jsonData = {
            msgType: NetMessageEnum.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.sendWebSocketRequest(jsonData, "Update Time-Step");
    }

    public sendParameterUpdate(paramName: string, paramValue: number): void {
        const jsonData = {
            msgType: NetMessageEnum.ID_UPDATE_RATE_PARAM,
            paramName: paramName,
            paramValue: paramValue,
        };
        this.sendWebSocketRequest(jsonData, "Rate Parameter Update");
    }

    public sendModelDefinition(model: string): void {
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
    public startRemoteSimPreRun(
        timeStep: number,
        numTimeSteps: number
    ): Promise<void> {
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_PRE_RUN_SIMULATION,
            timeStep: timeStep,
            numTimeSteps: numTimeSteps,
        };

        return this.connectToRemoteServer(this.getIp())
            .then(() => {
                this.sendWebSocketRequest(jsonData, "Start Simulation Pre-Run");
            })
            .catch((e) => {
                throw new FrontEndError(e.message, ErrorLevel.ERROR);
            });
    }

    public startRemoteSimLive(): Promise<void> {
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_LIVE_SIMULATION,
        };

        return this.connectToRemoteServer(this.getIp())
            .then(() => {
                this.sendWebSocketRequest(jsonData, "Start Simulation Live");
            })
            .catch((e) => {
                throw new FrontEndError(e.message, ErrorLevel.ERROR);
            });
    }

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
        this.lastRequestedFile = fileName;
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
            "file-name": fileName,
        };

        // begins a stream which will include a TrajectoryFileInfo and a series of VisDataMessages
        // Note that it is possible for the first vis data to arrive before the TrajectoryFileInfo...
        return this.connectToRemoteServer(this.getIp())
            .then(() => {
                this.sendWebSocketRequest(
                    jsonData,
                    "Start Trajectory File Playback"
                );
            })
            .catch((error) => {
                throw new FrontEndError(error.message, ErrorLevel.ERROR);
            });
    }

    public pauseRemoteSim(): void {
        this.sendWebSocketRequest(
            { msgType: NetMessageEnum.ID_VIS_DATA_PAUSE },
            "Pause Simulation"
        );
    }

    public resumeRemoteSim(): void {
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

    public gotoRemoteSimulationTime(time: number): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
                time: time,
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

    public sendUpdate(obj: Record<string, unknown>): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_UPDATE_SIMULATION_STATE,
                data: obj,
            },
            "Send update instructions to simulation server"
        );
    }

    public convertSmoldyn(obj: Record<string, unknown>): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                trajType: "smoldyn",
                data: obj,
            },
            "Convert smoldyn output to simularium file format"
        );
    }
}
