import { TrajectoryType } from "../constants.js";
import { ConversionClient } from "../simularium/ConversionClient.js";
import { NetConnectionParams } from "../simularium/WebsocketClient.js";

// todo fix this along with tests that use it
export class DummyOctopusServicesClient extends ConversionClient {
    public lastRequestedFile = "";
    private conversionCompleteDelay: number;
    public onConversionComplete: (fileName: string) => void;

    constructor(
        netConnectionPArams: NetConnectionParams,
        lastRequestedFile: string
    ) {
        super(netConnectionPArams, lastRequestedFile, () => {});
        this.lastRequestedFile = "";
        this.conversionCompleteDelay = 2000;
        this.onConversionComplete = () => {
            /* do nothing */
        };
    }

    public setOnConversionCompleteHandler(
        handler: (fileName: string) => void
    ): void {
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
