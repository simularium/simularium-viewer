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