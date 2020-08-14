export interface EncodedTypeMapping {
    [key: number]: string;
}

export interface TrajectoryFileInfo {
    timeStepSize: number;
    totalDuration: number;
    boxSizeX: number;
    boxSizeY: number;
    boxSizeZ: number;
    typeMapping: EncodedTypeMapping;
}
