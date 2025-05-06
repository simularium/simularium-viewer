import { TrajectoryType } from "../constants.js";
import { FrontEndError } from "./FrontEndError.js";
import {
    NetMessageEnum,
    NetConnectionParams,
    NetMessage,
    WebsocketClient,
} from "./WebsocketClient.js";

export class ConversionClient {
    private webSocketClient: WebsocketClient;
    public onConversionComplete: (fileName: string) => void;
    public handleError: (error: FrontEndError) => void | (() => void);
    public lastRequestedFile: string;

    constructor(
        netConnectionSettings: NetConnectionParams,
        errorHandler?: (error: FrontEndError) => void
    ) {
        this.webSocketClient = new WebsocketClient(
            netConnectionSettings,
            errorHandler
        );
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });
        this.lastRequestedFile = "";
        this.onConversionComplete = () => {
            /* do nothing */
        };
    }

    public disconnect(): void {
        this.webSocketClient.disconnect();
    }

    public setOnConversionCompleteHandler(
        handler: (fileName: string) => void
    ): void {
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

    public async convertTrajectory(
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        fileName: string
    ): Promise<void> {
        await this.webSocketClient.connectToRemoteServer();
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
