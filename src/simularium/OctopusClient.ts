import { TrajectoryType } from "../constants.js";
import { WebsocketClient, NetMessageEnum } from "./WebsocketClient.js";

export class OctopusServicesClient {
    private webSocketClient: WebsocketClient;
    private lastRequestedFile = "";
    private healthCheckHandler: () => void;

    constructor(webSocketClient: WebsocketClient) {
        this.webSocketClient = webSocketClient;
        this.healthCheckHandler = () => {
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
}
