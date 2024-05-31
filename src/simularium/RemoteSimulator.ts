import jsLogger from "js-logger";
import { v4 as uuidv4 } from "uuid";
import { ILogger } from "js-logger";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import {
    WebsocketClient,
    NetMessageEnum,
    MessageEventLike,
} from "./WebsocketClient";
import type { NetMessage, ErrorMessage } from "./WebsocketClient";
import { ISimulator } from "./ISimulator";
import { TrajectoryFileInfoV2, VisDataMessage } from "./types";
import { TrajectoryType } from "../constants";

// a RemoteSimulator is a ISimulator that connects to the Octopus back end server
// and plays back a trajectory specified in the NetConnectionParams
export class RemoteSimulator implements ISimulator {
    public webSocketClient: WebsocketClient;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (NetMessage) => void;
    public onTrajectoryDataArrive: (NetMessage) => void;
    public healthCheckHandler: () => void;
    protected lastRequestedFile: string;
    public handleError: (error: FrontEndError) => void | (() => void);

    public constructor(
        webSocketClient: WebsocketClient,
        errorHandler?: (error: FrontEndError) => void
    ) {
        this.webSocketClient = webSocketClient;
        this.lastRequestedFile = "";
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });

        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);
        this.registerBinaryMessageHandlers();
        this.registerJsonMessageHandlers();

        this.onTrajectoryFileInfoArrive = () => {
            /* do nothing */
        };
        this.onTrajectoryDataArrive = () => {
            /* do nothing */
        };
        this.healthCheckHandler = () => {
            /* do nothing */
        };
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

    public setHealthCheckHandler(handler: () => void): void {
        this.healthCheckHandler = handler;
    }

    public socketIsValid(): boolean {
        return this.webSocketClient.socketIsValid();
    }

    public getLastRequestedFile(): string {
        return this.lastRequestedFile;
    }

    /**
     *   Websocket Message Handlers
     * */

    public onBinaryIdVisDataArrive(event: MessageEventLike): void {
        const OFFSET_TO_NAME_LENGTH = 8;
        const floatView = new Float32Array(event.data);
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
    }

    public onHeartbeatPing(msg: NetMessage): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                connId: msg.connId,
                msgType: NetMessageEnum.ID_HEARTBEAT_PONG,
            },
            "Heartbeat pong"
        );
    }

    public onJsonIdVisDataArrive(msg: NetMessage): void {
        if (msg.fileName === this.lastRequestedFile) {
            this.onTrajectoryDataArrive(msg);
        }
    }

    public updateTimestep(): void {
        this.logger.debug("Update Timestep Message Arrived");
        // TODO: implement callback
    }

    public updateRateParam(): void {
        this.logger.debug("Update Rate Param Message Arrived");
        // TODO: implement callback
    }

    public onModelDefinitionArrive(): void {
        this.logger.debug("Model Definition Arrived");
        // TODO: implement callback
    }

    public onErrorMsg(msg: ErrorMessage): void {
        this.logger.error(
            "Error message of type ",
            msg.errorCode,
            " arrived: ",
            msg.errorMsg
        );
        const error = new FrontEndError(msg.errorMsg, ErrorLevel.WARNING);
        this.handleError(error);
        // TODO: specific handling based on error code
    }

    private registerBinaryMessageHandlers(): void {
        this.webSocketClient.addBinaryMessageHandler(
            NetMessageEnum.ID_VIS_DATA_ARRIVE,
            (msg) => this.onBinaryIdVisDataArrive(msg)
        );
    }

    private registerJsonMessageHandlers(): void {
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_TRAJECTORY_FILE_INFO,
            (msg) => this.onTrajectoryFileInfoArrive(msg)
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_HEARTBEAT_PING,
            (msg) => this.onHeartbeatPing(msg)
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_VIS_DATA_ARRIVE,
            (msg) => this.onJsonIdVisDataArrive(msg)
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_UPDATE_TIME_STEP,
            (_msg) => this.updateTimestep()
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_UPDATE_RATE_PARAM,
            (_msg) => this.updateRateParam()
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_MODEL_DEFINITION,
            (_msg) => this.onModelDefinitionArrive()
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_SERVER_HEALTHY_RESPONSE,
            (_msg) => this.healthCheckHandler()
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_ERROR_MSG,
            (msg) => this.onErrorMsg(msg as ErrorMessage)
        );
    }

    /**
     * WebSocket Connect
     * */
    public disconnect(): void {
        this.webSocketClient.disconnect();
    }

    public getIp(): string {
        return this.webSocketClient.getIp();
    }

    public isConnectedToRemoteServer(): boolean {
        return this.socketIsValid();
    }

    public async connectToRemoteServer(): Promise<string> {
        this.registerBinaryMessageHandlers();
        this.registerJsonMessageHandlers();
        return this.webSocketClient.connectToRemoteServer();
    }

    /**
     * Websocket Update Parameters
     */
    public sendTimeStepUpdate(newTimeStep: number): void {
        const jsonData = {
            msgType: NetMessageEnum.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.webSocketClient.sendWebSocketRequest(jsonData, "Update Time-Step");
    }

    public sendParameterUpdate(paramName: string, paramValue: number): void {
        const jsonData = {
            msgType: NetMessageEnum.ID_UPDATE_RATE_PARAM,
            paramName: paramName,
            paramValue: paramValue,
        };
        this.webSocketClient.sendWebSocketRequest(
            jsonData,
            "Rate Parameter Update"
        );
    }

    public sendModelDefinition(model: string): void {
        const dataToSend = {
            model: model,
            msgType: NetMessageEnum.ID_MODEL_DEFINITION,
        };
        this.webSocketClient.sendWebSocketRequest(
            dataToSend,
            "Model Definition"
        );
    }

    /**
     * WebSocket Simulation Control
     */
    public startRemoteSimPreRun(
        _timeStep: number,
        _numTimeSteps: number
    ): void {
        // not implemented
    }

    public startRemoteSimLive(): void {
        // not implemented
    }

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
        this.lastRequestedFile = fileName;
        const jsonData = {
            msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
            fileName: fileName,
        };

        // begins a stream which will include a TrajectoryFileInfo and a series of VisDataMessages
        // Note that it is possible for the first vis data to arrive before the TrajectoryFileInfo...
        return this.connectToRemoteServer()
            .then(() => {
                this.webSocketClient.sendWebSocketRequest(
                    jsonData,
                    "Start Trajectory File Playback"
                );
            })
            .catch((error) => {
                throw new FrontEndError(error.message, ErrorLevel.ERROR);
            });
    }

    public pauseRemoteSim(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_PAUSE,
                fileName: this.lastRequestedFile,
            },
            "Pause Simulation"
        );
    }

    public resumeRemoteSim(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_RESUME,
                fileName: this.lastRequestedFile,
            },
            "Resume Simulation"
        );
    }

    public abortRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_ABORT,
                fileName: this.lastRequestedFile,
            },
            "Abort Simulation"
        );
    }

    public requestSingleFrame(startFrameNumber: number): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
                frameNumber: startFrameNumber,
                fileName: this.lastRequestedFile,
            },
            "Request Single Frame"
        );
    }

    public gotoRemoteSimulationTime(time: number): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
                time: time,
                fileName: this.lastRequestedFile,
            },
            "Load single frame at specified Time"
        );
    }

    public requestTrajectoryFileInfo(fileName: string): void {
        this.lastRequestedFile = fileName;
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
                fileName: fileName,
            },
            "Initialize trajectory file info"
        );
    }

    public sendUpdate(obj: Record<string, unknown>): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_UPDATE_SIMULATION_STATE,
                data: obj,
            },
            "Send update instructions to simulation server"
        );
    }

    // Start autoconversion and roll right into the simulation
    public convertTrajectory(
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        providedFileName?: string
    ): Promise<void> {
        return this.connectToRemoteServer()
            .then(() => {
                this.sendTrajectory(dataToConvert, fileType, providedFileName);
            })
            .catch((e) => {
                throw new FrontEndError(e.message, ErrorLevel.ERROR);
            });
    }

    public sendTrajectory(
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        providedFileName?: string
    ): void {
        // Check for provided file name, and if none provided
        // generate random file name for converted file to be stored on the server
        const fileName =
            providedFileName !== undefined
                ? providedFileName
                : uuidv4() + ".simularium";
        this.lastRequestedFile = fileName;
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                trajType: fileType.toLowerCase(),
                fileName: fileName,
                data: dataToConvert,
            },
            "Convert trajectory output to simularium file format"
        );
    }

    public checkServerHealth(): Promise<void> {
        return this.connectToRemoteServer()
            .then(() => {
                this.webSocketClient.sendWebSocketRequest(
                    {
                        msgType: NetMessageEnum.ID_CHECK_HEALTH_REQUEST,
                    },
                    "Request server health check"
                );
            })
            .catch((e) => {
                this.handleError(
                    new FrontEndError(e.message, ErrorLevel.WARNING)
                );
            });
    }

    public cancelConversion(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_CANCEL_CONVERSION,
                fileName: this.lastRequestedFile,
            },
            "Cancel the requested autoconversion"
        );
        this.lastRequestedFile = "";
    }
}
