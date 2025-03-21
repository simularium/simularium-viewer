// Gotta set up a separate RemoteMetricsCalculator in case we have a non-remote
// simulator and want to calculate metrics anyways

import { FrontEndError } from "./FrontEndError.js";
import { BaseRemoteClient } from "./RemoteClient.js";
import { PlotConfig } from "./types.js";
import {
    NetMessageEnum,
    NetMessage,
    NetConnectionParams,
} from "./WebsocketClient.js";

export class RemoteMetricsCalculator extends BaseRemoteClient {
    public handleError: (error: FrontEndError) => void | (() => void);

    public constructor(
        netConnectionSettings: NetConnectionParams,
        lastRequestedFile: string,
        errorHandler?: (error: FrontEndError) => void
    ) {
        super(netConnectionSettings, lastRequestedFile);
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });
    }

    protected onConnected(): void {
        this.registerJsonMessageHandlers();
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

        this.webSocketClient.addJsonMessageHandler(
            NetMessageEnum.ID_PLOT_DATA_RESPONSE,
            this.onPlotDataArrive
        );
    }
}
