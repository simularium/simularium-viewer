import { mapValues } from "lodash";
import * as si from "si-prefix";

import { DEFAULT_CAMERA_SPEC } from "../constants";
import {
    AgentDisplayData,
    EncodedTypeMapping,
    TrajectoryFileInfo,
    TrajectoryFileInfoAny,
    TrajectoryFileInfoV1,
} from "./types";
import { AgentDisplayDataWithGeometry } from "./VisGeometry";

/*
Handles different trajectory file format versions.
Currently supported versions: 1, 2
*/
const LATEST_VERSION = 2;
const VERSION_NUM_ERROR = "Invalid version number in TrajectoryFileInfo:";

const sanitizeAgentMapGeometryData = (
    typeMapping: EncodedTypeMapping
): { [key: number]: AgentDisplayDataWithGeometry } => {
    return mapValues(typeMapping, (value: AgentDisplayData) => {
        let geometry = {};
        if (value.geometry) {
            let url = value.geometry.url || "";
            let { displayType } = value.geometry;
            if (!displayType) {
                // we're relying on the data to have a displayType to tell us what sort of data the url is pointing at
                // if the user fails to provide the displayType, we'll default to loading a sphere, and clear out the url
                url = "";
                displayType = "SPHERE";
            }

            geometry = {
                ...value.geometry,
                displayType,
                url,
                color: value.geometry.color || "",
            };
        } else {
            geometry = {
                displayType: "SPHERE",
                url: "",
                color: "",
            };
        }
        return {
            ...value,
            geometry,
        } as AgentDisplayDataWithGeometry;
    });
};

export const updateTrajectoryFileInfoFormat = (
    msg: TrajectoryFileInfoAny
): TrajectoryFileInfo => {
    let output = msg;

    switch (msg.version) {
        case LATEST_VERSION:
            output = {
                ...msg,
                typeMapping: sanitizeAgentMapGeometryData(msg.typeMapping),
            };
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
                cameraDefault: DEFAULT_CAMERA_SPEC,
                timeStepSize: v1Data.timeStepSize,
                totalSteps: v1Data.totalSteps,
                typeMapping: sanitizeAgentMapGeometryData(v1Data.typeMapping),
                version: LATEST_VERSION,
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
