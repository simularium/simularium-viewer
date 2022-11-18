import jsLogger from "js-logger";
import { ILogger } from "js-logger";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import {
    WebsocketClient,
    NetConnectionParams,
    NetMessageEnum,
    MessageEventLike,
    NetMessage,
} from "./WebsocketClient";
import { ISimulator } from "./ISimulator";
import { TrajectoryFileInfoV2, VisDataMessage } from "./types";

const enum PlayBackType {
    ID_LIVE_SIMULATION = 0,
    ID_PRE_RUN_SIMULATION = 1,
    ID_TRAJECTORY_FILE_PLAYBACK = 2,
    // insert new values here before LENGTH
    LENGTH,
}
// a RemoteSimulator is a ISimulator that connects to the Simularium Engine
// back end server and plays back a trajectory specified in the NetConnectionParams
export class RemoteSimulator implements ISimulator {
    private webSocketClient: WebsocketClient;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (NetMessage) => void;
    public onTrajectoryDataArrive: (NetMessage) => void;
    public loadFile: (NetMessage) => void;
    protected lastRequestedFile: string;
    public connectionTimeWaited: number;
    public connectionRetries: number;
    public handleError: (error: FrontEndError) => void | (() => void);

    public constructor(
        opts?: NetConnectionParams,
        errorHandler?: (error: FrontEndError) => void
    ) {
        this.connectionTimeWaited = 0;
        this.connectionRetries = 0;
        this.webSocketClient = new WebsocketClient(opts, errorHandler);
        this.lastRequestedFile = "";
        this.onBinaryIdVisDataArrive.bind(this);
        this.onJsonIdVisDataArrive.bind(this);
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
        this.loadFile = () => {
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

    // Sets callback to notify when file conversion is finished and
    // .simularium file is available
    public setLoadFileHandler(
        handler: (msg: Record<string, unknown>) => void
    ): void {
        this.loadFile = handler;
    }

    public socketIsValid(): boolean {
        return this.webSocketClient.socketIsValid();
    }

    /**
     *   Websocket Message Handlers
     * */

    public onBinaryIdVisDataArrive(
        event: MessageEvent | MessageEventLike
    ): void {
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
        this.sendWebSocketRequest(
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

    public updateTimestep(msg: NetMessage): void {
        this.logger.debug("Update Timestep Message Arrived");
        // TODO: implement callback
    }

    public updateRateParam(msg: NetMessage): void {
        this.logger.debug("Update Rate Param Message Arrived");
        // TODO: implement callback
    }

    public onModelDefinitionArrive(msg: NetMessage): void {
        this.logger.debug("Model Definition Arrived");
        // TODO: implement callback
    }

    private registerBinaryMessageHandlers(): void {
        this.webSocketClient.addBinaryMessageHandler(
            NetMessageEnum.ID_VIS_DATA_ARRIVE,
            this.onBinaryIdVisDataArrive
        );
    }

    private registerJsonMessageHandlers(): void {
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_CONVERTED_TRAJECTORY,
            this.loadFile
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_TRAJECTORY_FILE_INFO,
            this.onTrajectoryFileInfoArrive
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_HEARTBEAT_PING,
            this.onHeartbeatPing
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_VIS_DATA_ARRIVE,
            this.onJsonIdVisDataArrive
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_UPDATE_TIME_STEP,
            this.updateTimestep
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_UPDATE_RATE_PARAM,
            this.updateRateParam
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_MODEL_DEFINITION,
            this.onModelDefinitionArrive
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

    public async connectToRemoteServer(): Promise<string> {
        this.registerBinaryMessageHandlers();
        this.registerJsonMessageHandlers();
        return this.webSocketClient.connectToRemoteServer();
    }

    /**
     * Websocket Send Helper Functions
     */
    private logWebSocketRequest(whatRequest, jsonData): void {
        this.logger.debug("Web Socket Request Sent: ", whatRequest, jsonData);
    }

    private sendWebSocketRequest(jsonData, requestDescription: string): void {
        if (this.webSocketClient && this.socketIsValid()) {
            this.webSocketClient.sendWebSocketRequest(
                jsonData,
                requestDescription
            );
            this.logWebSocketRequest(requestDescription, jsonData);
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

        return this.connectToRemoteServer()
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

        return this.connectToRemoteServer()
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
        return this.connectToRemoteServer()
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

    public convertTrajectory(
        obj: Record<string, unknown>,
        fileType: string
    ): Promise<void> {
        return this.connectToRemoteServer()
            .then(() => {
                this.sendTrajectory(obj, fileType);
            })
            .catch((e) => {
                throw new FrontEndError(e.message, ErrorLevel.ERROR);
            });
    }

    public sendTrajectory(
        obj: Record<string, unknown>,
        fileType: string
    ): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                trajType: fileType.toLowerCase(),
                data: obj,
            },
            "Convert trajectory output to simularium file format"
        );
    }
}
