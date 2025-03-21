import { WebsocketClient, NetConnectionParams } from "./WebsocketClient.js";
import { FrontEndError, ErrorLevel } from "./FrontEndError.js";

/**
 * This class is an abstraction layer to handle creating and
 * managing a websocket connection to a remote server.
 * Classes that extend this class can use the websocket connection
 * and override methods as needed.
 * In use by RemoteSimulator, ConversionClient, and RemoteMetricsCalculator.
 *
 * To use, create an instance, then call initialize() to connect to the server,
 * and run any postConnect functionality defined in the implementation,
 * like registering message handlers.
 */
export class BaseRemoteClient {
    protected _webSocketClient: WebsocketClient | null;
    protected netConnectionSettings: NetConnectionParams;
    public handleError: (error: FrontEndError) => void;
    public lastRequestedFile: string;

    constructor(
        netConnectionSettings: NetConnectionParams,
        lastRequestedFile: string,
        errorHandler?: (error: FrontEndError) => void
    ) {
        this.netConnectionSettings = netConnectionSettings;
        this._webSocketClient = null;
        this.lastRequestedFile = lastRequestedFile;
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });
    }

    public setErrorHandler(handler: (msg: Error) => void): void {
        this.handleError = handler;
    }

    /**
     * Subclasses can override to register message handlers
     * or do other setup after a successful connection.
     */
    protected onConnected(): void {
        // default no-op
    }

    public async connectToRemoteServer(): Promise<string> {
        if (this.isConnectedToRemoteServer()) {
            return "Already connected to remote server";
        }
        try {
            this._webSocketClient = new WebsocketClient(
                this.netConnectionSettings
            );
            await this._webSocketClient.connectToRemoteServer();
            return "Connected to remote server";
        } catch {
            throw new FrontEndError(
                "Failed to connect to remote server",
                ErrorLevel.ERROR
            );
        }
    }

    public async initialize(fileName: string): Promise<void> {
        this.lastRequestedFile = fileName;
        try {
            await this.connectToRemoteServer();
            this.onConnected();
        } catch (error) {
            this.handleError(error as FrontEndError);
        }
    }

    public disconnect(): void {
        this._webSocketClient?.disconnect();
        this._webSocketClient = null;
    }

    public getIp(): string {
        return this.webSocketClient.getIp();
    }

    public isConnectedToRemoteServer(): boolean {
        return this._webSocketClient?.socketIsValid() ?? false;
    }

    protected get webSocketClient(): WebsocketClient {
        if (!this._webSocketClient) {
            throw new FrontEndError(
                "WebsocketClient not set",
                ErrorLevel.WARNING
            );
        }
        return this._webSocketClient;
    }
}
