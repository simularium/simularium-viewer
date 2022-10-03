"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _versionHandlers = require("../simularium/versionHandlers");

var _types = require("../visGeometry/types");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

var invalidVersionData = {
  connId: "7496831076a233f0-2c337fed-4493-ad92-79f194744174ba05635426fd",
  msgType: 13,
  size: {
    x: 100,
    y: 100,
    z: 100
  },
  spatialUnitFactorMeters: 1e-6,
  timeStepSize: 0.1,
  totalSteps: 150,
  typeMapping: {
    "0": {
      name: "Actin"
    },
    "1": {
      name: "Budding vesicle"
    }
  },
  version: 999.9
};
var v1Data = {
  connId: "7496831076a233f0-2c337fed-4493-ad92-79f194744174ba05635426fd",
  msgType: 13,
  size: {
    x: 100,
    y: 100,
    z: 100
  },
  spatialUnitFactorMeters: 1.5e-9,
  timeStepSize: 0.1,
  totalSteps: 150,
  typeMapping: {
    "0": {
      name: "Actin"
    },
    "1": {
      name: "Budding vesicle"
    }
  },
  version: 1
};
var v2Data = {
  connId: "7496831076a233f0-2c337fed-4493-ad92-79f194744174ba05635426fd",
  msgType: 13,
  size: {
    x: 100,
    y: 100,
    z: 100
  },
  cameraDefault: {
    position: {
      x: 0,
      y: 0,
      z: 120
    },
    lookAtPosition: {
      x: 0,
      y: 0,
      z: 0
    },
    upVector: {
      x: 0,
      y: 1,
      z: 0
    },
    fovDegrees: 75
  },
  spatialUnits: {
    magnitude: 1.5,
    name: "nm"
  },
  timeUnits: {
    magnitude: 1,
    name: "s"
  },
  timeStepSize: 0.1,
  totalSteps: 150,
  typeMapping: {
    "0": {
      name: "Actin"
    },
    "1": {
      name: "Budding vesicle"
    }
  },
  version: 2
};
var typeMappingWithGeo = {
  "0": {
    name: "Actin",
    geometry: {
      displayType: _types.GeometryDisplayType.PDB,
      color: "#fff",
      url: "url-to-data"
    }
  },
  "1": {
    name: "Budding vesicle",
    geometry: {
      displayType: _types.GeometryDisplayType.PDB,
      color: "#fff",
      url: "url-to-data"
    }
  }
};
var typeMappingWithDefaultGeo = {
  "0": {
    name: "Actin",
    geometry: {
      displayType: _types.GeometryDisplayType.SPHERE,
      color: "",
      url: ""
    }
  },
  "1": {
    name: "Budding vesicle",
    geometry: {
      displayType: _types.GeometryDisplayType.SPHERE,
      color: "",
      url: ""
    }
  }
};
var typeMappingNoGeo = {
  "0": {
    name: "Actin"
  },
  "1": {
    name: "Budding vesicle"
  }
};
var typeMappingMissingDisplayType = {
  "0": {
    name: "Actin",
    geometry: {
      color: "",
      url: "url"
    }
  },
  "1": {
    name: "Budding vesicle",
    geometry: {
      color: "",
      url: "url"
    }
  }
};
var typeMappingMissingUrl = {
  "0": {
    name: "Actin",
    geometry: {
      color: "",
      displayType: _types.GeometryDisplayType.OBJ,
      url: ""
    }
  },
  "1": {
    name: "Budding vesicle",
    geometry: {
      color: "",
      displayType: _types.GeometryDisplayType.PDB,
      url: ""
    }
  }
};

var v3Data = _objectSpread(_objectSpread({}, v2Data), {}, {
  typeMapping: typeMappingWithDefaultGeo,
  version: 3
});

describe("Version handlers", function () {
  describe("makeUrlErrorMessage", function () {
    test("it will create an error message for the user given an empty string fro the url", function () {
      var key = "1";
      var url = "";
      var message = (0, _versionHandlers.makeMissingDisplayTypeErrorMessage)(key, url);
      expect(message).toEqual("No typeMapping[".concat(key, "].geometry.displayType. Geometry will default to spheres"));
    });
    test("it will create an error message for the user if there is a url", function () {
      var key = "1";
      var url = "url-to-geo.com";
      var message = (0, _versionHandlers.makeMissingDisplayTypeErrorMessage)(key, url);
      expect(message).toEqual("Missing typeMapping[".concat(key, "].geometry.displayType, so we couldn't request ").concat(url, ". Geometry will default to spheres"));
    });
  });
  describe("makeMissingUrlErrorMessage", function () {
    test("it will create a message for the user if the url is missing but the displayType was PDB or OBJ", function () {
      var key = "1";
      var displayType = _types.GeometryDisplayType.OBJ;
      var message = (0, _versionHandlers.makeMissingUrlErrorMessage)(key, displayType);
      expect(message).toEqual("DisplayType was ".concat(displayType, " but missing typeMapping[").concat(key, "].geometry.url, so we couldn't request the file. Geometry will default to spheres"));
    });
  });
  describe("sanitizeAgentMapGeometryData", function () {
    test("it returns back the same data if it already has geometry data per agent", function () {
      var result = (0, _versionHandlers.sanitizeAgentMapGeometryData)(typeMappingWithGeo);
      expect(result).toEqual(typeMappingWithGeo);
    });
    test("it adds in default geo data if none is provided", function () {
      var result = (0, _versionHandlers.sanitizeAgentMapGeometryData)(typeMappingNoGeo);
      expect(result).toEqual(typeMappingWithDefaultGeo);
    });
    test("it converts to the default geo data if displayType is missing", function () {
      var result = (0, _versionHandlers.sanitizeAgentMapGeometryData)(typeMappingMissingDisplayType);
      expect(result).toEqual(typeMappingWithDefaultGeo);
    });
    test("it will pass up an error message if there is a url but no displayType", function () {
      var message = "";

      var onError = function onError(error) {
        return message = error.message;
      };

      (0, _versionHandlers.sanitizeAgentMapGeometryData)(typeMappingMissingDisplayType, onError);
      expect(message).toContain("Geometry will default to spheres");
    });
    test("it will return default geometry if there is a url but displayType is OBJ or PDB ", function () {
      var result = (0, _versionHandlers.sanitizeAgentMapGeometryData)(typeMappingMissingUrl);
      expect(result).toEqual(typeMappingWithDefaultGeo);
    });
    test("it will pass up an error message if there is a url but displayType is OBJ or PDB ", function () {
      var message = "";

      var onError = function onError(error) {
        return message = error.message;
      };

      (0, _versionHandlers.sanitizeAgentMapGeometryData)(typeMappingMissingUrl, onError);
      expect(message).toContain("Geometry will default to spheres");
    });
  });
  describe("updateTrajectoryFileInfoFormat", function () {
    test("it throws error if data has invalid version", function () {
      var msg = invalidVersionData;

      var conversion = function conversion() {
        (0, _versionHandlers.updateTrajectoryFileInfoFormat)(msg);
      };

      expect(conversion).toThrowError(RangeError);
    });
    test("it returns v3(latest) data as is", function () {
      var msg = v3Data;
      var output = (0, _versionHandlers.updateTrajectoryFileInfoFormat)(msg);
      expect(output).toEqual(v3Data);
    });
    test("it converts v1 data to latest format", function () {
      var msg = v1Data;
      var output = (0, _versionHandlers.updateTrajectoryFileInfoFormat)(msg);
      expect(output).toEqual(v3Data);
    });
    test("it converts v2 data to latest format", function () {
      var msg = v2Data;
      var output = (0, _versionHandlers.updateTrajectoryFileInfoFormat)(msg);
      expect(output).toEqual(v3Data);
    });
  });
});