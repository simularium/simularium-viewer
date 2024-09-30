import { FrontEndError } from "./FrontEndError";
import { AgentDisplayDataWithGeometry, TrajectoryFileInfo, TrajectoryFileInfoAny } from "./types";
import { GeometryDisplayType } from "../visGeometry/types";
export interface AgentTypeVisDataPreProcessing {
    displayType?: GeometryDisplayType;
    url?: string;
    color?: string;
}
export interface AgentDisplayDataPreProcessing {
    name: string;
    geometry?: AgentTypeVisDataPreProcessing;
}
export interface EncodedTypeMappingPreProcessing {
    [key: number]: AgentDisplayDataPreProcessing;
}
export declare const makeMissingDisplayTypeErrorMessage: (key: string, url: string) => string;
export declare const makeMissingUrlErrorMessage: (key: string, displayType: GeometryDisplayType.PDB | GeometryDisplayType.OBJ) => string;
export declare const sanitizeAgentMapGeometryData: (typeMapping: EncodedTypeMappingPreProcessing, onError?: (error: FrontEndError) => void) => {
    [key: number]: AgentDisplayDataWithGeometry;
};
export declare const updateTrajectoryFileInfoFormat: (msg: TrajectoryFileInfoAny, onError?: (error: FrontEndError) => void) => TrajectoryFileInfo;
