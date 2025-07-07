import { NetConnectionParams, IClientSimulatorImpl } from "../simularium";
import { ISimulariumFile } from "../simularium/ISimulariumFile";
export interface RemoteSimulatorParams {
    fileName: string;
    netConnectionSettings?: NetConnectionParams;
    requestJson?: boolean;
    prefetchFrames?: boolean;
}

export interface ClientSimulatorParams {
    fileName: string;
    clientSimulatorImpl?: IClientSimulatorImpl;
}

export interface LocalFileSimulatorParams {
    fileName: string;
    simulariumFile?: ISimulariumFile;
    geoAssets?: { [key: string]: string };
}

export type SimulatorParams =
    | RemoteSimulatorParams
    | ClientSimulatorParams
    | LocalFileSimulatorParams;
