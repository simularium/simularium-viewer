// Gotta set up a separate RemoteMetricsCalculator in case we have a non-remote
// simulator and want to calculate metrics anyways

import { FrontEndError } from "./FrontEndError.js";
import { Plot, PlotConfig } from "./types.js";
import { NetMessageEnum, WebsocketClient } from "./WebsocketClient.js";

export class RemoteMetricsCalculator {
    public handleError: (error: FrontEndError) => void | (() => void);
    public onAvailableMetricsArrive: (msg: Record<string, unknown>) => void;
    public onPlotDataArrive: (msg: Plot[]) => void;
    private webSocketClient: WebsocketClient;

    public constructor(
        webSocketClient: WebsocketClient,
        errorHandler?: (error: FrontEndError) => void,
        metricsHandler?: (msg: Record<string, unknown>) => void,
        plotDataHandler?: (plotData: Plot[]) => void
    ) {
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });
        this.webSocketClient = webSocketClient;
        this.onAvailableMetricsArrive =
            metricsHandler ||
            (() => {
                /* do nothing */
            });
        this.onPlotDataArrive =
            plotDataHandler ||
            (() => {
                /* do nothing */
            });
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

    public getPlotData(
        data: Record<string, unknown>,
        plots: Array<PlotConfig>,
        fileName?: string
    ): void {
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

    private registerJsonMessageHandlers(): void {
        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_AVAILABLE_METRICS_RESPONSE,
            (msg) => this.onAvailableMetricsArrive(msg["metrics"])
        );

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_PLOT_DATA_RESPONSE,
            (msg) => this.onPlotDataArrive(msg["plotData"])
        );
    }
}
