import VersionHandler from "../simularium/VersionHandler";

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
    spatialUnits: {
        magnitude: 1e-6,
        name: "m",
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

describe("Version handlers", () => {
    let versionHandler: VersionHandler;
    beforeEach(() => {
        versionHandler = new VersionHandler();
    });

    describe("updateTrajectoryFileInfoFormat", () => {
        test("it throws error if data has invalid version", () => {
            const msg = invalidVersionData;
            const conversion = () => {
                versionHandler.updateTrajectoryFileInfoFormat(msg);
            };
            expect(conversion).toThrowError(RangeError);
        });
        test("it returns v2 (latest) data as is", () => {
            const msg = v2Data;
            const trajectoryFileInfo = versionHandler.updateTrajectoryFileInfoFormat(
                msg
            );
            expect(trajectoryFileInfo).toEqual(v2Data);
        });
        test("it converts v1 data to v2 format", () => {
            const msg = v1Data;
            const trajectoryFileInfo = versionHandler.updateTrajectoryFileInfoFormat(
                msg
            );
            expect(trajectoryFileInfo).toEqual(v2Data);
        });
    });

    describe("createScaleBarLabel", () => {
        test("it throws error if data has not been converted to latest version yet", () => {
            const tickIntervalLength = 50;
            const functionCall = () => {
                versionHandler.createScaleBarLabel(tickIntervalLength);
            };
            expect(functionCall).toThrowError(Error);
        });
        test("it uses the user-specified unit for the scale bar for v2 data", () => {
            const msg = v2Data;
            versionHandler.updateTrajectoryFileInfoFormat(msg);
            const tickIntervalLength = 50;

            const scaleBarLabel = versionHandler.createScaleBarLabel(
                tickIntervalLength
            );

            // tickIntervalLength * spatialUnits.magnitude = 50 * 1e-6 = 0.00005
            expect(scaleBarLabel).toEqual("0.00005 m");
        });
        test("it determines best unit for the scale bar for v1 data", () => {
            const msg = v1Data;
            versionHandler.updateTrajectoryFileInfoFormat(msg);
            const tickIntervalLength = 50;

            const scaleBarLabel = versionHandler.createScaleBarLabel(
                tickIntervalLength
            );

            expect(scaleBarLabel).toEqual("50 µm");
        });
    });
});
