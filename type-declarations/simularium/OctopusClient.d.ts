import { TrajectoryType } from "../constants.js";
import { WebsocketClient } from "./WebsocketClient.js";
export declare class OctopusServicesClient {
    private webSocketClient;
    private lastRequestedFile;
    private healthCheckHandler;
    constructor(webSocketClient: WebsocketClient);
    setHealthCheckHandler(handler: () => void): void;
    connectToRemoteServer(): Promise<string>;
    convertTrajectory(dataToConvert: Record<string, unknown>, fileType: TrajectoryType, fileName: string): Promise<void>;
    cancelConversion(): void;
    checkServerHealth(): Promise<void>;
    sendSmoldynData(outFileName: string, smoldynInput: string): Promise<void>;
}
