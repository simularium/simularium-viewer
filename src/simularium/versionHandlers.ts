import * as si from "si-prefix";

import {
    TrajectoryFileInfo,
    TrajectoryFileInfoAny,
    TrajectoryFileInfoV1,
} from "./types";

/*
Handles different trajectory file format versions.
Currently supported versions: 1, 2
*/
const LATEST_VERSION = 2;
const VERSION_NUM_ERROR = "Invalid version number in TrajectoryFileInfo:";

export const updateTrajectoryFileInfoFormat = (
    msg: TrajectoryFileInfoAny
): TrajectoryFileInfo => {
    let output = msg;

    switch (msg.version) {
        case LATEST_VERSION:
            break;
        case 1:
            const v1Data = msg as TrajectoryFileInfoV1;

            // Ex: 1.5e-9 -> [1.5, "nm"]
            const spatialUnitsArray = si.meter.convert(
                v1Data.spatialUnitFactorMeters
            );
            const spatialUnitsMagnitude = spatialUnitsArray[0];
            // The si-prefix library abbreviates "micro" as "mc", so swap it out with "µ"
            const spatialUnitsName = spatialUnitsArray[1].replace("mc", "µ");

            // Can't manipulate v1Data in place because TypeScript doesn't allow deleting of
            // non-optional keys
            output = {
                connId: v1Data.connId,
                msgType: v1Data.msgType,
                size: v1Data.size,
                spatialUnits: {
                    magnitude: spatialUnitsMagnitude,
                    name: spatialUnitsName,
                },
                timeUnits: {
                    magnitude: 1,
                    name: "s",
                },
                cameraDefault: {
                    position: {
                        x: 0,
                        y: 0,
                        z: 120,
                    },
                    lookAtPosition: {
                        x: 0,
                        y: 0,
                        z: 0,
                    },
                    upVector: {
                        x: 0,
                        y: 1,
                        z: 0,
                    },
                    fovDegrees: 75,
                },
                timeStepSize: v1Data.timeStepSize,
                totalSteps: v1Data.totalSteps,
                typeMapping: v1Data.typeMapping,
                version: 2,
            };
            console.warn(
                "Using default camera settings since none were provided"
            );
            break;
        default:
            throw new RangeError(VERSION_NUM_ERROR + msg.version);
    }

    return output as TrajectoryFileInfo;
};
