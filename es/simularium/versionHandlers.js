import _defineProperty from "@babel/runtime/helpers/defineProperty";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

import { mapValues } from "lodash";
import * as si from "si-prefix";
import { DEFAULT_CAMERA_SPEC } from "../constants";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import { GeometryDisplayType } from "../visGeometry/types"; // the data may come in missing any of these values

/*
Handles different trajectory file format versions.
Currently supported versions: 1, 2
*/
var LATEST_VERSION = 3;
var VERSION_NUM_ERROR = "Invalid version number in TrajectoryFileInfo:";
export var makeMissingDisplayTypeErrorMessage = function makeMissingDisplayTypeErrorMessage(key, url) {
  if (url) {
    return "Missing typeMapping[".concat(key, "].geometry.displayType, so we couldn't request ").concat(url, ". Geometry will default to spheres");
  } else {
    return "No typeMapping[".concat(key, "].geometry.displayType. Geometry will default to spheres");
  }
};
export var makeMissingUrlErrorMessage = function makeMissingUrlErrorMessage(key, displayType) {
  return "DisplayType was ".concat(displayType, " but missing typeMapping[").concat(key, "].geometry.url, so we couldn't request the file. Geometry will default to spheres");
};
export var sanitizeAgentMapGeometryData = function sanitizeAgentMapGeometryData(typeMapping, onError) {
  return mapValues(typeMapping, function (value, key) {
    var geometry = {};

    if (value.geometry) {
      var url = value.geometry.url || "";
      var displayType = value.geometry.displayType;

      if (!displayType) {
        // we're relying on the data to have a displayType to tell us what sort of data the url is pointing at
        // if the user fails to provide the displayType, we'll default to loading a sphere, and clear out the url
        var message = makeMissingDisplayTypeErrorMessage(key, url);

        if (onError) {
          onError(new FrontEndError(message, ErrorLevel.WARNING));
        } else {
          console.log(message);
        }

        url = "";
        displayType = GeometryDisplayType.SPHERE;
      } else if (!url && (displayType === GeometryDisplayType.PDB || displayType === GeometryDisplayType.OBJ)) {
        var _message = makeMissingUrlErrorMessage(key, displayType);

        if (onError) {
          onError(new FrontEndError(_message, ErrorLevel.WARNING));
        } else {
          console.log(_message);
        }

        displayType = GeometryDisplayType.SPHERE;
      }

      geometry = _objectSpread(_objectSpread({}, value.geometry), {}, {
        displayType: displayType,
        url: url,
        color: value.geometry.color || ""
      });
    } else {
      geometry = {
        displayType: "SPHERE",
        url: "",
        color: ""
      };
    }

    return _objectSpread(_objectSpread({}, value), {}, {
      geometry: geometry
    });
  });
};
export var updateTrajectoryFileInfoFormat = function updateTrajectoryFileInfoFormat(msg, onError) {
  var output = _objectSpread(_objectSpread({}, msg), {}, {
    typeMapping: sanitizeAgentMapGeometryData(msg.typeMapping, onError),
    version: LATEST_VERSION
  });

  switch (msg.version) {
    case LATEST_VERSION:
      break;

    case 2:
      break;

    case 1:
      var v1Data = msg; // Ex: 1.5e-9 -> [1.5, "nm"]

      var spatialUnitsArray = si.meter.convert(v1Data.spatialUnitFactorMeters);
      var spatialUnitsMagnitude = spatialUnitsArray[0]; // The si-prefix library abbreviates "micro" as "mc", so swap it out with "µ"

      var spatialUnitsName = spatialUnitsArray[1].replace("mc", "µ"); // Can't manipulate v1Data in place because TypeScript doesn't allow deleting of
      // non-optional keys

      output = {
        connId: v1Data.connId,
        msgType: v1Data.msgType,
        size: v1Data.size,
        spatialUnits: {
          magnitude: spatialUnitsMagnitude,
          name: spatialUnitsName
        },
        timeUnits: {
          magnitude: 1,
          name: "s"
        },
        cameraDefault: DEFAULT_CAMERA_SPEC,
        timeStepSize: v1Data.timeStepSize,
        totalSteps: v1Data.totalSteps,
        typeMapping: output.typeMapping,
        version: LATEST_VERSION
      };
      console.warn("Using default camera settings since none were provided");
      break;

    default:
      throw new RangeError(VERSION_NUM_ERROR + msg.version);
  }

  return output;
};