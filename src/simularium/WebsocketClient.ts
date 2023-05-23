import jsLogger from "js-logger";
import { ILogger } from "js-logger";
import { FrontEndError, ErrorLevel } from "./FrontEndError";

export interface NetMessage {
    connId: string;
    msgType: number;
    fileName: string;
}
// TODO: proposed new NetMessage data type:
// This factors the raw data structure away from the networking and transmission info.
// This allows the data structure to make a bit more sense with respect to typescript typing,
// and also for raw file drag n drop it doesn't need connection info or msgtype.
// interface NetMessage {
//     connId: string; // unique connection to server
//     msgType: number; // identifies the data structure of the message
//     fileName: string; // identifies the trajectory this connection is dealing with
//     payload: Object; // the JS object with the message data itself
// }

interface SimulariumEvent {
    data: string;
}

export type MessageEventLike = SimulariumEvent | MessageEvent;

// these have been set to correspond to backend values
export const enum NetMessageEnum {
    ID_UNDEFINED_WEB_REQUEST = 0,
    ID_VIS_DATA_ARRIVE = 1,
    ID_VIS_DATA_REQUEST = 2,
    ID_VIS_DATA_FINISH = 3,
    ID_VIS_DATA_PAUSE = 4,
    ID_VIS_DATA_RESUME = 5,
    ID_VIS_DATA_ABORT = 6,
    ID_UPDATE_TIME_STEP = 7,
    ID_UPDATE_RATE_PARAM = 8,
    ID_MODEL_DEFINITION = 9,
    ID_HEARTBEAT_PING = 10,
    ID_HEARTBEAT_PONG = 11,
    ID_TRAJECTORY_FILE_INFO = 12,
    ID_GOTO_SIMULATION_TIME = 13,
    ID_INIT_TRAJECTORY_FILE = 14,
    ID_UPDATE_SIMULATION_STATE = 15,
    ID_CONVERT_TRAJECTORY_FILE = 16,
    ID_AVAILABLE_METRICS_REQUEST = 17,
    ID_AVAILABLE_METRICS_RESPONSE = 18,
    ID_PLOT_DATA_REQUEST = 19,
    ID_PLOT_DATA_RESPONSE = 20,
    // insert new values here before LENGTH
    LENGTH,
}

export const CONNECTION_SUCCESS_MSG = "Remote sim successfully started";
export const CONNECTION_FAIL_MSG =
    "Failed to connect to server; try reloading. If the problem persists, there may be a problem with your connection speed or the server might be too busy.";

export interface NetConnectionParams {
    serverIp?: string;
    serverPort?: number;
    secureConnection?: boolean;
    useOctopus?: boolean;
}

export class WebsocketClient {
    private webSocket: WebSocket | null;
    private serverIp: string;
    private serverPort: number;
    private secureConnection: boolean;
    public connectionTimeWaited: number;
    public connectionRetries: number;
    protected jsonMessageHandlers: Map<NetMessageEnum, (NetMessage) => void>;
    protected binaryMessageHandlers: Map<
        NetMessageEnum,
        (MessageEventLike) => void
    >;
    protected logger: ILogger;
    public handleError: (error: FrontEndError) => void | (() => void);

    public constructor(
        opts?: NetConnectionParams,
        errorHandler?: (error: FrontEndError) => void
    ) {
        this.webSocket = null;
        this.jsonMessageHandlers = new Map<
            NetMessageEnum,
            (NetMessage) => void
        >();
        this.binaryMessageHandlers = new Map<
            NetMessageEnum,
            (NetMessage) => void
        >();
        this.serverIp = opts && opts.serverIp ? opts.serverIp : "localhost";
        this.serverPort = opts && opts.serverPort ? opts.serverPort : 9002;
        this.secureConnection =
            opts && opts.secureConnection ? opts.secureConnection : false;
        this.connectionTimeWaited = 0;
        this.connectionRetries = 0;
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });

        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);

        // Frees the reserved backend in the event that the window closes w/o disconnecting
        window.addEventListener("beforeunload", this.onClose.bind(this));
    }

    /**
     * WebSocket State
     */
    private socketIsConnecting(): boolean {
        return (
            this.webSocket !== null &&
            this.webSocket.readyState === this.webSocket.CONNECTING
        );
    }

    public socketIsValid(): boolean {
        return !(
            this.webSocket === null ||
            this.webSocket.readyState === this.webSocket.CLOSED
        );
    }

    private socketIsConnected(): boolean {
        return (
            this.webSocket !== null &&
            this.webSocket.readyState === this.webSocket.OPEN
        );
    }

    /**
     *   Websocket Message Handling
     * */
    public addBinaryMessageHandler(
        messageType: NetMessageEnum,
        handler: (msg: MessageEventLike) => void
    ): void {
        this.binaryMessageHandlers[messageType.valueOf()] = handler;
    }

    public addJsonMessageHandler(
        messageType: NetMessageEnum,
        handler: (msg: NetMessage) => void
    ): void {
        this.jsonMessageHandlers[messageType] = handler;
    }

    protected onMessage(event: MessageEventLike): void {
        // where we receive websocket messages
        if (!this.socketIsValid()) {
            return;
        }

        if (event.data instanceof ArrayBuffer) {
            // Handle binary message
            const floatView = new Float32Array(event.data);
            const binaryMsgType = floatView[0];
            if (binaryMsgType in this.binaryMessageHandlers) {
                this.binaryMessageHandlers[binaryMsgType](event);
            } else {
                this.logger.error(
                    "Unexpected binary message arrived of type ",
                    binaryMsgType
                );
            }
            return;
        }

        // Handle json message
        const msg: NetMessage = JSON.parse(event.data);
        const jsonMsgType = msg.msgType;
        const numMsgTypes = NetMessageEnum.LENGTH;

        if (jsonMsgType > numMsgTypes || jsonMsgType < 1) {
            // this suggests either the back-end is out of sync, or a connection to an unknown back-end
            //  either would be very bad
            this.logger.error(
                "Unrecognized web message of type ",
                msg.msgType,
                " arrived"
            );
            return;
        }

        if (jsonMsgType in this.jsonMessageHandlers) {
            this.jsonMessageHandlers[jsonMsgType](msg);
        } else {
            this.logger.error(
                "Unexpected json message arrived of type ",
                jsonMsgType
            );
        }
        this.logger.debug("Web request recieved", msg.msgType);
    }

    private onOpen(): void {
        /* do nothing */
    }
    private onClose(): void {
        /* do nothing */
    }

    /**
     * WebSocket Connect
     * */
    public createWebSocket(uri: string): void {
        // Create and initialize a WebSocket object

        if (this.socketIsValid()) {
            this.disconnect();
        }
        this.webSocket = new WebSocket(uri);
        this.webSocket.binaryType = "arraybuffer";
        this.logger.debug("WS Connection Request Sent: ", uri);

        // message handler
        this.webSocket.onopen = this.onOpen.bind(this);
        this.webSocket.onclose = this.onClose.bind(this);
        this.webSocket.onmessage = this.onMessage.bind(this);
    }

    public disconnect(): void {
        if (!this.socketIsValid()) {
            this.logger.warn("disconnect failed, client is not connected");
            return;
        }

        if (this.webSocket !== null) {
            this.webSocket.close();
        }
    }

    public getIp(): string {
        return `${this.secureConnection ? "wss" : "ws"}://${this.serverIp}:${
            this.serverPort
        }/`;
    }

    public async waitForWebSocket(timeout: number): Promise<boolean> {
        // Wait a specified time then check WebSocket status
        return new Promise((resolve) =>
            setTimeout(() => {
                resolve(this.socketIsConnected());
            }, timeout)
        );
    }

    public async checkConnection(
        address: string,
        timeout = 1000,
        maxRetries = 1
    ): Promise<boolean> {
        // Check if the WebSocket becomes connected within an allotted amount
        // of time and number of retries.

        // Initially wait for a max wait time of maxWaitTime, then retry
        // connecting <maxRetries> time(s). In a retry, only wait for the
        // amount of time specified as timeout.

        const maxWaitTime = 4 * timeout;

        const isConnected = await this.waitForWebSocket(timeout);
        this.connectionTimeWaited += timeout;

        if (isConnected) {
            return true;
        } else if (this.connectionTimeWaited < maxWaitTime) {
            return this.checkConnection(address, timeout);
        } else if (this.connectionRetries < maxRetries) {
            this.createWebSocket(address);
            this.connectionRetries++;
            return this.checkConnection(address, timeout);
        } else {
            return false;
        }
    }

    public async connectToRemoteServer(): Promise<string> {
        const address = this.getIp();
        this.connectionTimeWaited = 0;
        this.connectionRetries = 0;

        if (this.socketIsConnected()) {
            return CONNECTION_SUCCESS_MSG;
        }

        this.createWebSocket(address);
        const isConnectionSuccessful = await this.checkConnection(address);

        if (isConnectionSuccessful) {
            return CONNECTION_SUCCESS_MSG;
        } else {
            // caught by functions that call this
            throw new Error(CONNECTION_FAIL_MSG);
        }
    }

    /**
     * Websocket Send Helper Functions
     */
    private logWebSocketRequest(whatRequest, jsonData): void {
        this.logger.debug("Web Socket Request Sent: ", whatRequest, jsonData);
    }

    public sendWebSocketRequest(
        jsonData: Record<string, unknown>,
        requestDescription: string
    ): void {
        if (this.socketIsValid()) {
            if (this.webSocket !== null) {
                this.webSocket.send(JSON.stringify(jsonData));
            }
            this.logWebSocketRequest(requestDescription, jsonData);
        } else {
            console.error(
                "Request to server cannot be made with a closed Websocket connection."
            );
            this.handleError(
                new FrontEndError(
                    "Connection to server is closed; please try reloading. If the problem persists, the server may be too busy. Please try again at another time.",
                    ErrorLevel.ERROR
                )
            );
        }
    }
}
