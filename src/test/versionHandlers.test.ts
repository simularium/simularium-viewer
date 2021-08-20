import { PdbDisplayType, SphereDisplayType } from "../simularium/types";
import {
    sanitizeAgentMapGeometryData,
    updateTrajectoryFileInfoFormat,
} from "../simularium/versionHandlers";

const invalidVersionData = {
    connId: "7496831076a233f0-2c337fed-4493-ad92-79f194744174ba05635426fd",
    msgType: 13,
    size: {
        x: 100,
        y: 100,
        z: 100,
    },
    spatialUnitFactorMeters: 1e-6,
    timeStepSize: 0.1,
    totalSteps: 150,
    typeMapping: {
        "0": {
            name: "Actin",
        },
        "1": {
            name: "Budding vesicle",
        },
    },
    version: 999.9,
};

const v1Data = {
    connId: "7496831076a233f0-2c337fed-4493-ad92-79f194744174ba05635426fd",
    msgType: 13,
    size: {
        x: 100,
        y: 100,
        z: 100,
    },
    spatialUnitFactorMeters: 1.5e-9,
    timeStepSize: 0.1,
    totalSteps: 150,
    typeMapping: {
        "0": {
            name: "Actin",
        },
        "1": {
            name: "Budding vesicle",
        },
    },
    version: 1,
};

const v2Data = {
    connId: "7496831076a233f0-2c337fed-4493-ad92-79f194744174ba05635426fd",
    msgType: 13,
    size: {
        x: 100,
        y: 100,
        z: 100,
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
    spatialUnits: {
        magnitude: 1.5,
        name: "nm",
    },
    timeUnits: {
        magnitude: 1,
        name: "s",
    },
    timeStepSize: 0.1,
    totalSteps: 150,
    typeMapping: {
        "0": {
            name: "Actin",
        },
        "1": {
            name: "Budding vesicle",
        },
    },
    version: 2,
};

const typeMappingWithGeo = {
    "0": {
        name: "Actin",
        geometry: {
            displayType: "PDB" as PdbDisplayType,
            color: "#fff",
            url: "url-to-data",
        },
    },
    "1": {
        name: "Budding vesicle",
        geometry: {
            displayType: "PDB" as PdbDisplayType,
            color: "#fff",
            url: "url-to-data",
        },
    },
};

const typeMappingWithDefaultGeo = {
    "0": {
        name: "Actin",
        geometry: {
            displayType: "SPHERE" as SphereDisplayType,
            color: "",
            url: "",
        },
    },
    "1": {
        name: "Budding vesicle",
        geometry: {
            displayType: "SPHERE" as SphereDisplayType,
            color: "",
            url: "",
        },
    },
};

const typeMappingNoGeo = {
    "0": {
        name: "Actin",
    },
    "1": {
        name: "Budding vesicle",
    },
};

const typeMappingMissingDisplayType = {
    "0": {
        name: "Actin",
        geometry: {
            color: "",
            url: "url",
        },
    },
    "1": {
        name: "Budding vesicle",
        geometry: {
            color: "",
            url: "url",
        },
    },
};

const v3Data = {
    ...v2Data,
    typeMapping: typeMappingWithDefaultGeo,
    version: 3,
};

describe("Version handlers", () => {
    describe("sanitizeAgentMapGeometryData", () => {
        test("it returns back the same data if it already has geometry data per agent", () => {
            const result = sanitizeAgentMapGeometryData(typeMappingWithGeo);
            expect(result).toEqual(typeMappingWithGeo);
        });
    });
    describe("sanitizeAgentMapGeometryData", () => {
        test("it adds in default geo data if none is provided", () => {
            const result = sanitizeAgentMapGeometryData(typeMappingNoGeo);
            expect(result).toEqual(typeMappingWithDefaultGeo);
        });
    });
    describe("sanitizeAgentMapGeometryData", () => {
        test("it converts to the default geo data if displayType is missing", () => {
            const result = sanitizeAgentMapGeometryData(
                typeMappingMissingDisplayType
            );
            expect(result).toEqual(typeMappingWithDefaultGeo);
        });
    });
    describe("updateTrajectoryFileInfoFormat", () => {
        test("it throws error if data has invalid version", () => {
            const msg = invalidVersionData;
            const conversion = () => {
                updateTrajectoryFileInfoFormat(msg);
            };
            expect(conversion).toThrowError(RangeError);
        });
        test("it returns v3(latest) data as is", () => {
            const msg = v2Data;
            const output = updateTrajectoryFileInfoFormat(msg);
            expect(output).toEqual(v3Data);
        });
        test("it converts v1 data to latest format", () => {
            const msg = v1Data;
            const output = updateTrajectoryFileInfoFormat(msg);
            expect(output).toEqual(v3Data);
        });
        test("it converts v2 data to latest format", () => {
            const msg = v2Data;
            const output = updateTrajectoryFileInfoFormat(msg);
            expect(output).toEqual(v3Data);
        });
    });
});
