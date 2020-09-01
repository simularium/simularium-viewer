import { VisDataMessage } from "./VisData";

export interface AgentDisplayData {
    name: string;
    pdb?: string;
    mesh?: string;
}
export interface EncodedTypeMapping {
    [key: number]: AgentDisplayData;
}

export interface TrajectoryFileInfo {
    version: number;
    timeStepSize: number;
    totalSteps: number;
    size: {
        x: number;
        y: number;
        z: number;
    };
    typeMapping: EncodedTypeMapping;
}

export interface SimulariumFileFormat {
    trajectoryInfo: TrajectoryFileInfo;
    spatialData: VisDataMessage;
    plotData: any; //TODO type this
}
