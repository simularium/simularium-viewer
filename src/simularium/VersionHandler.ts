// import { NetMessage } from "./NetConnection";
import {
    TrajectoryFileInfo,
    TrajectoryFileInfoV1,
    TrajectoryFileInfoV2,
} from "./types";

/*
Handles different trajectory file format versions.
Currently supported versions: 1, 2
*/

export const updateTrajectoryFileInfoFormat = (
    msg: TrajectoryFileInfo
): TrajectoryFileInfo => {
    const latestVersion = 2;

    if (msg.version === latestVersion) {
        return msg;
    } else if (msg.version > latestVersion) {
        throw `Invalid version number in TrajectoryFileInfo: ${msg.version}`;
    }
};
