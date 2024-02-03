import { ISimulariumFile, SimulariumController } from "../../src";

export interface PlaybackOption {
    value: string;
    label: string;
}

export interface CustomParameters {
    name: string;
    data_type: string;
    description: string;
    required: boolean;
    help: string;
    options?: string[];
}

export interface BaseType {
    isBaseType: true;
    id: string;
    data: string;
    match: string;
}

export interface CustomType {
    [key: string]: {
        "python::module": string;
        "python::object": string;
        parameters: CustomParameters;
    };
}

export interface InputParams {
    localBackendServer: boolean;
    useOctopus: boolean;
}

export interface SimulariumFile {
    name: string;
    data: ISimulariumFile | null;
}

export interface SimulatorConfiguration {
    clientSimulator: any; // todo type this more precisely
    action?: (controller: SimulariumController) => void;
}

export interface SimulatorConfigurations {
    [key: string]: SimulatorConfiguration;
}
