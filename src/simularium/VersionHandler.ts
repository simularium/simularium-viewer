/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const si = require("si-prefix");

import {
    TrajectoryFileInfo,
    TrajectoryFileInfoAny,
    TrajectoryFileInfoV1,
} from "./types";

export default class VersionHandler {
    /*
    Converts a TrajectoryFileInfo object to the latest format and handles any operations 
    that require knowing the original version number.
    
    Currently supported versions: 1, 2
    */

    private static readonly LATEST_VERSION = 2;
    private static readonly VERSION_NUM_ERROR =
        "Invalid version number in TrajectoryFileInfo:";
    public originalVersion: number;
    public updatedTrajectoryFileInfo: TrajectoryFileInfo | undefined;

    public constructor() {
        this.originalVersion = 0;
        this.updatedTrajectoryFileInfo = undefined;
    }

    public updateTrajectoryFileInfoFormat(
        msg: TrajectoryFileInfoAny
    ): TrajectoryFileInfo {
        this.originalVersion = msg.version;

        switch (this.originalVersion) {
            case VersionHandler.LATEST_VERSION:
                this.updatedTrajectoryFileInfo = msg as TrajectoryFileInfo;
                break;
            case 1:
                const v1Data = msg as TrajectoryFileInfoV1;

                // Can't manipulate v1Data in place because TypeScript doesn't allow deleting of
                // non-optional keys
                this.updatedTrajectoryFileInfo = {
                    connId: v1Data.connId,
                    msgType: v1Data.msgType,
                    size: v1Data.size,
                    spatialUnits: {
                        magnitude: v1Data.spatialUnitFactorMeters,
                        name: "m",
                    },
                    timeUnits: {
                        magnitude: 1,
                        name: "s",
                    },
                    timeStepSize: v1Data.timeStepSize,
                    totalSteps: v1Data.totalSteps,
                    typeMapping: v1Data.typeMapping,
                    version: 2,
                };
                break;
            default:
                throw new RangeError(
                    VersionHandler.VERSION_NUM_ERROR + msg.version
                );
        }

        return this.updatedTrajectoryFileInfo;
    }

    public createScaleBarLabel(tickIntervalLength: number): string {
        let scaleBarLabelNumber: number;
        let scaleBarLabelUnit: string;

        if (!this.updatedTrajectoryFileInfo) {
            throw new Error(
                "VersionHandler.createScaleBarLabel() was called before converting TrajectoryFileInfo format to the latest version."
            );
        }

        switch (this.originalVersion) {
            case 2:
                // Honor the user's unit specifications
                scaleBarLabelNumber =
                    tickIntervalLength *
                    this.updatedTrajectoryFileInfo.spatialUnits.magnitude;
                scaleBarLabelUnit = this.updatedTrajectoryFileInfo.spatialUnits
                    .name;
                break;
            case 1:
                // Determine the best unit for the scale bar label, e.g.:
                // 0.000000015 -> [15, "nm"]
                const scaleBarLabelArray = si.meter.convert(
                    tickIntervalLength *
                        this.updatedTrajectoryFileInfo.spatialUnits.magnitude
                );

                scaleBarLabelNumber = scaleBarLabelArray[0];
                // The si-prefix library abbreviates "micro" as "mc", so swap it out with "µ"
                scaleBarLabelUnit = scaleBarLabelArray[1].replace("mc", "µ");
                break;
            default:
                throw new RangeError(
                    VersionHandler.VERSION_NUM_ERROR + this.originalVersion
                );
        }

        scaleBarLabelNumber = parseFloat(scaleBarLabelNumber.toPrecision(2));
        return scaleBarLabelNumber + " " + scaleBarLabelUnit;
    }
}
