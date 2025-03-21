import {
    NetConnectionParams,
    NetMessageEnum,
    NetMessage,
} from "./WebsocketClient.js";
import { TrajectoryType } from "../constants.js";
import { BaseRemoteClient } from "./RemoteClient.js";
import { FrontEndError } from "./FrontEndError.js";

export class ConversionClient extends BaseRemoteClient {
    public onConversionComplete: (fileName: string) => void;

    constructor(
        netConnectionSettings: NetConnectionParams,
        lastRequestedFile: string,
        errorHandler?: (error: FrontEndError) => void
    ) {
        super(netConnectionSettings, lastRequestedFile, errorHandler);
        this.onConversionComplete = () => {
            /* do nothing */
        };
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

    public async sendSmoldynData(
        outFileName: string,
        smoldynInput: string
    ): Promise<void> {
        await this.connectToRemoteServer();
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
