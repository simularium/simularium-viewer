import { ClientSimulator } from "./ClientSimulator";
import { LocalFileSimulator } from "./LocalFileSimulator";
import { RemoteSimulator } from "./RemoteSimulator";
import {
    SimulatorParams,
    RemoteSimulatorParams,
    ClientSimulatorParams,
    LocalFileSimulatorParams,
} from "./types";

export const getSimulatorClassFromParams = (params?: SimulatorParams) => {
    if (!params || !params.fileName) {
        return { simulatorClass: null, typedParams: null };
    }
    if ("netConnectionSettings" in params) {
        return {
            simulatorClass: RemoteSimulator,
            typedParams: params as RemoteSimulatorParams,
        };
    } else if ("clientSimulatorImpl" in params) {
        return {
            simulatorClass: ClientSimulator,
            typedParams: params as ClientSimulatorParams,
        };
    } else if ("simulariumFile" in params) {
        return {
            simulatorClass: LocalFileSimulator,
            typedParams: params as LocalFileSimulatorParams,
        };
    } else {
        return { simulatorClass: null, typedParams: null };
    }
};
