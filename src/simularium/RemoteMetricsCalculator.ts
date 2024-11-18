// Gotta set up a separate RemoteMetricsCalculator in case we have a non-remote
// simulator and want to calculate metrics anyways

import { FrontEndError } from "./FrontEndError";
import { PlotConfig } from "./types";
import { NetMessageEnum, WebsocketClient, NetMessage } from "./WebsocketClient";

export class RemoteMetricsCalculator {
    public handleError: (error: FrontEndError) => void | (() => void);
    private webSocketClient: WebsocketClient;

    public constructor(webSocketClient: WebsocketClient, errorHandler?: (error: FrontEndError) => void) {
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });
        this.webSocketClient = webSocketClient;
    }

    public async connectToRemoteServer(): Promise<string> {
        this.registerJsonMessageHandlers();
        return this.webSocketClient.connectToRemoteServer();
    }

    public socketIsValid(): boolean {
        return this.webSocketClient.socketIsValid();
    }

    public getAvailableMetrics(): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_AVAILABLE_METRICS_REQUEST,
            },
            "Request available metrics from the metrics service"
        );
    }

    public getPlotData(data: Record<string, unknown>, plots: Array<PlotConfig>, fileName?: string): void {
        this.webSocketClient.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_PLOT_DATA_REQUEST,
                fileName: fileName,
                data: data,
                plots: plots,
            },
            "Request plot data for a given trajectory and plot types"
        );
    }

    public onAvailableMetricsArrive(msg: NetMessage): void {
        // TODO: implement callback
        console.log("Available metrics: ", msg["metrics"]);
    }

    public onPlotDataArrive(msg: NetMessage): void {
        // TODO: implement callback
        console.log("Plot data: ", msg["plotData"]);
    }

    private registerJsonMessageHandlers(): void {
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_AVAILABLE_METRICS_RESPONSE,
            this.onAvailableMetricsArrive
        );

        this.webSocketClient.addJsonMessageHandler(NetMessageEnum.ID_PLOT_DATA_RESPONSE, this.onPlotDataArrive);
    }
}
