import { FrontEndError } from "./FrontEndError.js";
import { PlotConfig } from "./types.js";
import { WebsocketClient, NetMessage } from "./WebsocketClient.js";
export declare class RemoteMetricsCalculator {
    handleError: (error: FrontEndError) => void | (() => void);
    private webSocketClient;
    constructor(webSocketClient: WebsocketClient, errorHandler?: (error: FrontEndError) => void);
    connectToRemoteServer(): Promise<string>;
    socketIsValid(): boolean;
    getAvailableMetrics(): void;
    getPlotData(data: Record<string, unknown>, plots: Array<PlotConfig>, fileName?: string): void;
    onAvailableMetricsArrive(msg: NetMessage): void;
    onPlotDataArrive(msg: NetMessage): void;
    private registerJsonMessageHandlers;
}
