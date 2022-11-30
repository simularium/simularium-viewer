import { ConvertedFileData } from "./types";

export interface IConverter {
    setLoadFileHandler(handler: (msg: ConvertedFileData) => void): void;

    convertTrajectory(
        data: Record<string, unknown>,
        fileType: string
    ): Promise<void>;

    sendTrajectory(obj: Record<string, unknown>, fileType: string): void;
}
