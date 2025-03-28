import { TrajectoryType } from "../constants.js";
import { FrontEndError } from "./FrontEndError.js";
import {
    NetMessageEnum,
    NetConnectionParams,
    NetMessage,
    WebsocketClient,
} from "./WebsocketClient.js";

export class ConversionClient extends WebsocketClient {
    public onConversionComplete: (fileName: string) => void;
    public lastRequestedFile: string;

    constructor(
        netConnectionSettings: NetConnectionParams,
        lastRequestedFile: string,
        errorHandler?: (error: FrontEndError) => void
    ) {
        super(netConnectionSettings, errorHandler);
        this.lastRequestedFile = lastRequestedFile;
        this.onConversionComplete = () => {
            /* do nothing */
        };
    }

    public async initialize(fileName: string): Promise<void> {
        this.lastRequestedFile = fileName;
        try {
            await this.connectToRemoteServer();
        } catch (error) {
            this.handleError(error as FrontEndError);
        }
    }

    public setOnConversionCompleteHandler(
        handler: (fileName: string) => void
    ): void {
        this.onConversionComplete = handler;
        this.addJsonMessageHandler(
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
        await this.connectToRemoteServer();
        this.lastRequestedFile = fileName;
        this.sendWebSocketRequest(
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
        this.sendWebSocketRequest(
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
        await this.connectToRemoteServer();
        this.lastRequestedFile = outFileName;
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_START_SMOLDYN,
                fileName: outFileName,
                smoldynInputVal: smoldynInput ?? undefined,
            },
            "Start smoldyn simulation"
        );
    }
}
