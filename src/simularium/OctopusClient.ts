import { TrajectoryType } from "../constants.js";
import { WebsocketClient, NetMessageEnum } from "./WebsocketClient.js";

export class OctopusServicesClient {
    private webSocketClient: WebsocketClient;
    private lastRequestedFile = "";

    constructor(webSocketClient: WebsocketClient) {
        this.webSocketClient = webSocketClient;
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
}
