import {
    TrajectoryFileInfo,
    TrajectoryFileInfoAny,
    TrajectoryFileInfoV1,
} from "./types";

/*
Handles different trajectory file format versions.
Currently supported versions: 1, 2
*/

export const updateTrajectoryFileInfoFormat = (
    msg: TrajectoryFileInfoAny
): TrajectoryFileInfo => {
    const latestVersion = 2;
    let output = msg;

    switch (msg.version) {
        case latestVersion:
            break;
        case 1:
            const v1Data = msg as TrajectoryFileInfoV1;

            // Can't manipulate v1Data in place because TypeScript doesn't allow deleting of
            // non-optional keys
            output = {
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
                `Invalid version number in TrajectoryFileInfo: ${msg.version}`
            );
    }

    return output as TrajectoryFileInfo;
};
