import { NetConnectionParams, IClientSimulatorImpl } from "../simularium";
import { ISimulariumFile } from "../simularium/ISimulariumFile";

export interface BaseSimulatorParams {
    fileName: string;
}

export interface RemoteSimulatorParams extends BaseSimulatorParams {
    netConnectionSettings?: NetConnectionParams;
    requestJson?: boolean;
    prefetchFrames?: boolean;
}

export interface ClientSimulatorParams extends BaseSimulatorParams {
    clientSimulatorImpl?: IClientSimulatorImpl;
}

export interface LocalFileSimulatorParams extends BaseSimulatorParams {
    simulariumFile?: ISimulariumFile;
    geoAssets?: { [key: string]: string };
}

export type SimulatorParams =
    | RemoteSimulatorParams
    | ClientSimulatorParams
    | LocalFileSimulatorParams;
