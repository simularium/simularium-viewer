import jsLogger from "js-logger";
import { ILogger } from "js-logger";
import { FrontEndError, ErrorLevel } from "../FrontEndError.js";
import { NetMessageEnum, MessageEventLike } from "../WebsocketClient.js";
import type { NetMessage, ErrorMessage } from "../WebsocketClient.js";
import { ISimulator } from "./ISimulator.js";
import { PlotConfig, TrajectoryFileInfoV2, VisDataMessage } from "../types.js";
import { RemoteSimulatorParams } from "./types.js";
import { BaseRemoteClient } from "../RemoteClient.js";

// a RemoteSimulator is a ISimulator that connects to the Octopus backend server
// and plays back a trajectory specified in the NetConnectionParams
export class RemoteSimulator extends BaseRemoteClient implements ISimulator {
    public onTrajectoryFileInfoArrive: (NetMessage) => void;
    public onTrajectoryDataArrive: (NetMessage) => void;
    protected logger: ILogger;
    private jsonResponse: boolean;

    constructor(
        params: RemoteSimulatorParams,
        errorHandler?: (error: FrontEndError) => void
    ) {
        if (!params.netConnectionSettings || !params.fileName) {
            throw new FrontEndError(
                "RemoteSimulator requires NetConnectionParams and file name."
            );
        }
        super(params.netConnectionSettings, params.fileName, errorHandler);
        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);
        this.onTrajectoryFileInfoArrive = () => {
            /* do nothing */
        };
        this.onTrajectoryDataArrive = () => {
            /* do nothing */
        };
        this.jsonResponse = params.requestJson || false;
    }

    protected onConnected(): void {
        this.registerBinaryMessageHandlers();
        this.registerJsonMessageHandlers();
        const jsonData = {
            msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
            fileName: this.lastRequestedFile,
        };

        this.webSocketClient.sendWebSocketRequest(
            jsonData,
            "Start Trajectory File Playback"
        );
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
            NetMessageEnum.ID_ERROR_MSG,
            (msg) => this.onErrorMsg(msg as ErrorMessage)
        );
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_AVAILABLE_METRICS_RESPONSE,
            (msg) => this.onAvailableMetricsArrive(msg)
        );
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_PLOT_DATA_RESPONSE,
            (msg) => this.onPlotDataArrive(msg)
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

    public pause(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_PAUSE,
                fileName: this.lastRequestedFile,
            },
            "Pause Simulation"
        );
    }

    public stream(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_RESUME,
                fileName: this.lastRequestedFile,
            },
            "Resume Simulation"
        );
    }

    public abort(): void {
        if (!this.isConnectedToRemoteServer()) {
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

    public requestFrame(startFrameNumber: number): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
                frameNumber: startFrameNumber,
                fileName: this.lastRequestedFile,
                jsonResponse: this.jsonResponse,
            },
            "Request Single Frame"
        );
    }

    public requestFrameByTime(time: number): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
                time: time,
                fileName: this.lastRequestedFile,
                jsonResponse: this.jsonResponse,
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
                jsonResponse: this.jsonResponse,
            },
            "Initialize trajectory file info"
        );
    }

    public requestAvailableMetrics(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_AVAILABLE_METRICS_REQUEST,
            },
            "Request available metrics from the metrics service"
        );
    }

    public requestPlotData(
        data: Record<string, unknown>,
        plots: Array<PlotConfig>
    ): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_PLOT_DATA_REQUEST,
                fileName: this.lastRequestedFile,
                data: data,
                plots: plots,
            },
            "Request plot data for a given trajectory and plot types"
        );
    }

    public onAvailableMetricsArrive(msg: NetMessage): void {
        // TODO: implement callback
        console.log("Available metrics: ", msg["metrics"]);
    }

    public onPlotDataArrive(msg: NetMessage): void {
        // TODO: implement callback
        console.log("Plot data: ", msg["plotData"]);
    }

    public sendUpdate(_obj: Record<string, unknown>): Promise<void> {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_UPDATE_SIMULATION_STATE,
                data: _obj,
            },
            "Send Update"
        );
        return Promise.resolve();
    }
}
