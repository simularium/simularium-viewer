import { TrajectoryType } from "../constants.js";
import { OctopusServicesClient } from "../simularium/OctopusClient.js";
import {
    WebsocketClient,
    NetConnectionParams,
} from "../simularium/WebsocketClient.js";

export class DummyOctopusServicesClient extends OctopusServicesClient {
    public webSocketClient: WebsocketClient;
    public lastRequestedFile = "";
    private conversionCompleteDelay: number;
    public onConversionComplete: (fileName: string) => void;

    constructor(opts: NetConnectionParams) {
        const webSocketClient = new WebsocketClient(opts);
        super(webSocketClient);
        this.webSocketClient = webSocketClient;
        this.lastRequestedFile = "";
        this.conversionCompleteDelay = 2000;
        this.onConversionComplete = () => {
            /* do nothing */
        };
    }

    public setOnConversionCompleteHandler(handler: () => void): void {
        this.onConversionComplete = handler;
        // waits two seconds, then fires conversion complete
        // mocking a return from the server
        setTimeout(
            () => this.onConversionComplete(this.lastRequestedFile),
            this.conversionCompleteDelay
        );
    }

    public async connectToRemoteServer(): Promise<string> {
        return this.webSocketClient.connectToRemoteServer();
    }

    public socketIsValid(): boolean {
        return true;
    }

    public async convertTrajectory(
        dataToConvert: Record<string, unknown>,
        fileType: TrajectoryType,
        fileName: string
    ): Promise<void> {
        this.lastRequestedFile = fileName;
    }

    public cancelConversion(): void {
        this.lastRequestedFile = "";
    }

    public async sendSmoldynData(outFileName: string): Promise<void> {
        this.lastRequestedFile = outFileName;
    }
}
