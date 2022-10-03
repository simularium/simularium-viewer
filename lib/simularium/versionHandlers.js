"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateTrajectoryFileInfoFormat = exports.sanitizeAgentMapGeometryData = exports.makeMissingUrlErrorMessage = exports.makeMissingDisplayTypeErrorMessage = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _lodash = require("lodash");

var si = _interopRequireWildcard(require("si-prefix"));

var _constants = require("../constants");

var _FrontEndError = require("./FrontEndError");

var _types = require("../visGeometry/types");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

/*
Handles different trajectory file format versions.
Currently supported versions: 1, 2
*/
var LATEST_VERSION = 3;
var VERSION_NUM_ERROR = "Invalid version number in TrajectoryFileInfo:";

var makeMissingDisplayTypeErrorMessage = function makeMissingDisplayTypeErrorMessage(key, url) {
  if (url) {
    return "Missing typeMapping[".concat(key, "].geometry.displayType, so we couldn't request ").concat(url, ". Geometry will default to spheres");
  } else {
    return "No typeMapping[".concat(key, "].geometry.displayType. Geometry will default to spheres");
  }
};

exports.makeMissingDisplayTypeErrorMessage = makeMissingDisplayTypeErrorMessage;

var makeMissingUrlErrorMessage = function makeMissingUrlErrorMessage(key, displayType) {
  return "DisplayType was ".concat(displayType, " but missing typeMapping[").concat(key, "].geometry.url, so we couldn't request the file. Geometry will default to spheres");
};

exports.makeMissingUrlErrorMessage = makeMissingUrlErrorMessage;

var sanitizeAgentMapGeometryData = function sanitizeAgentMapGeometryData(typeMapping, onError) {
  return (0, _lodash.mapValues)(typeMapping, function (value, key) {
    var geometry = {};

    if (value.geometry) {
      var url = value.geometry.url || "";
      var displayType = value.geometry.displayType;

      if (!displayType) {
        // we're relying on the data to have a displayType to tell us what sort of data the url is pointing at
        // if the user fails to provide the displayType, we'll default to loading a sphere, and clear out the url
        var message = makeMissingDisplayTypeErrorMessage(key, url);

        if (onError) {
          onError(new _FrontEndError.FrontEndError(message, _FrontEndError.ErrorLevel.WARNING));
        } else {
          console.log(message);
        }

        url = "";
        displayType = _types.GeometryDisplayType.SPHERE;
      } else if (!url && (displayType === _types.GeometryDisplayType.PDB || displayType === _types.GeometryDisplayType.OBJ)) {
        var _message = makeMissingUrlErrorMessage(key, displayType);

        if (onError) {
          onError(new _FrontEndError.FrontEndError(_message, _FrontEndError.ErrorLevel.WARNING));
        } else {
          console.log(_message);
        }

        displayType = _types.GeometryDisplayType.SPHERE;
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

exports.sanitizeAgentMapGeometryData = sanitizeAgentMapGeometryData;

var updateTrajectoryFileInfoFormat = function updateTrajectoryFileInfoFormat(msg, onError) {
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
        cameraDefault: _constants.DEFAULT_CAMERA_SPEC,
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

exports.updateTrajectoryFileInfoFormat = updateTrajectoryFileInfoFormat;