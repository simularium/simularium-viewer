import { TrajectoryType } from "../constants.js";
import {
    WebsocketClient,
    NetMessageEnum,
    NetMessage,
} from "./WebsocketClient.js";

export class OctopusServicesClient {
    public webSocketClient: WebsocketClient;
    public lastRequestedFile = "";
    private healthCheckHandler: () => void;
    public onConversionComplete: (fileName: string) => void;

    constructor(webSocketClient: WebsocketClient) {
        this.webSocketClient = webSocketClient;
        this.healthCheckHandler = () => {
            /* do nothing */
        };
        this.onConversionComplete = () => {
            /* do nothing */
        };
    }

    public setHealthCheckHandler(handler: () => void): void {
        this.healthCheckHandler = handler;
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_SERVER_HEALTHY_RESPONSE,
            () => this.healthCheckHandler()
        );
    }

    public setOnConversionCompleteHandler(handler: () => void): void {
        this.onConversionComplete = handler;
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_TRAJECTORY_FILE_INFO,
            (msg: NetMessage) => {
                if (
                    this.onConversionComplete &&
                    msg.fileName === this.lastRequestedFile
                ) {
                    this.onConversionComplete(msg.fileName);
                }
            }
        );
    }

    public async connectToRemoteServer(): Promise<string> {
        return this.webSocketClient.connectToRemoteServer();
    }

    public async convertTrajectory(
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        fileName: string
    ): Promise<void> {
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

    public cancelConversion(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_CANCEL_CONVERSION,
                fileName: this.lastRequestedFile,
            },
            "Cancel the requested autoconversion"
        );
        this.lastRequestedFile = "";
        this.setOnConversionCompleteHandler(() => {
            /* do nothing */
        });
    }

    public async checkServerHealth(): Promise<void> {
        await this.webSocketClient.connectToRemoteServer();
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_CHECK_HEALTH_REQUEST,
            },
            "Request server health check"
        );
    }

    public async sendSmoldynData(
        outFileName: string,
        smoldynInput: string
    ): Promise<void> {
        await this.webSocketClient.connectToRemoteServer();
        this.lastRequestedFile = outFileName;
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_START_SMOLDYN,
                fileName: outFileName,
                smoldynInputVal: smoldynInput ?? undefined,
            },
            "Start smoldyn simulation"
        );
    }

    public socketIsValid(): boolean {
        return this.webSocketClient.socketIsValid();
    }
}
