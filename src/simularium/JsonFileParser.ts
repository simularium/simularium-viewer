import type ISimulariumFile from "./ISimulariumFile";
import type {
    SimulariumFileFormat,
    TrajectoryFileInfo,
    VisDataFrame,
} from "./types";
import { FrontEndError } from "./FrontEndError";
import { compareTimes } from "../util";

export default class JsonFileReader implements ISimulariumFile {
    simulariumFile: SimulariumFileFormat;
    constructor(fileContents: SimulariumFileFormat) {
        this.simulariumFile = fileContents;

        const spatialData = this.simulariumFile.spatialData;
        if (!spatialData) {
            throw new FrontEndError(
                "Simularium files need 'spatialData' array"
            );
        }
        spatialData.bundleData.sort(
            (a: VisDataFrame, b: VisDataFrame): number =>
                a.frameNumber - b.frameNumber
        );
    }

    getTrajectoryFileInfo(): TrajectoryFileInfo {
        return this.simulariumFile.trajectoryInfo;
    }

    getNumFrames(): number {
        return this.simulariumFile.spatialData.bundleSize;
    }

    getFrameIndexAtTime(time: number): number {
        const { timeStepSize } = this.simulariumFile.trajectoryInfo;
        const bundleData = this.simulariumFile.spatialData.bundleData;
        // Find the index of the frame that has the time matching our target time
        const frameNumber = bundleData.findIndex((bundleData) => {
            return compareTimes(bundleData.time, time, timeStepSize) === 0;
        });
        return frameNumber;
    }

    getFrame(theFrameNumber: number): VisDataFrame {
        return this.simulariumFile.spatialData.bundleData[theFrameNumber];
    }
}
