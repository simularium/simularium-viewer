import BinaryFileReader from "../simularium/BinaryFileReader.js";
import { pad, makeBinary } from "./utils.js";

describe("binary simularium files", () => {
    test("it correctly identifies a binary simularium file signature", () => {
        const file = new Blob(["SIMULARIUMBINARY"]);
        return BinaryFileReader.isBinarySimulariumFile(file).then(
            (isBinary) => {
                expect(isBinary).toBe(true);
            }
        );
    });
    test("it correctly identifies an invalid binary simularium file signature", () => {
        const file = new Blob(["SIMULARIUMBINAR"]);
        return BinaryFileReader.isBinarySimulariumFile(file).then(
            (isBinary) => {
                expect(isBinary).toBe(false);
            }
        );
    });
    // build a header with no blocks.
    test("it correctly fails to read a file with no blocks", () => {
        const buffer = makeBinary([], []);
        const file = new Blob([buffer]);
        return BinaryFileReader.isBinarySimulariumFile(file).then(
            (isBinary) => {
                expect(isBinary).toBe(true);
                file.arrayBuffer().then((buffer) => {
                    expect(() => {
                        new BinaryFileReader(buffer);
                    }).toThrow();
                });
            }
        );
    });
    test("it throws when a spatial data block is missing", () => {
        const json = '{"foo":"bar"}';
        const buffer = makeBinary([pad(new TextEncoder().encode(json))], [1]);
        const file = new Blob([buffer]);
        return BinaryFileReader.isBinarySimulariumFile(file).then(
            (isBinary) => {
                expect(isBinary).toBe(true);
                file.arrayBuffer().then((buffer) => {
                    expect(() => {
                        new BinaryFileReader(buffer);
                    }).toThrow("No spatial data block found");
                });
            }
        );
    });
    test("it correctly initializes a file with one json block, one spatial block, and one plotdata block", () => {
        const tjijson = {
            msgType: 0,
            version: 2,
            timeStepSize: 1,
            totalSteps: 1,
            size: [7, 7, 7],
            typeMapping: {},
        };

        const plotData = JSON.stringify({ data: { baz: "bat" } });
        const buffer = makeBinary(
            [
                pad(new TextEncoder().encode(JSON.stringify(tjijson))),
                pad(new ArrayBuffer(8)),
                pad(new TextEncoder().encode(plotData)),
            ],
            [1, 3, 2]
        );
        const file = new Blob([buffer]);
        return BinaryFileReader.isBinarySimulariumFile(file).then(
            (isBinary) => {
                expect(isBinary).toBe(true);
                file.arrayBuffer().then((buffer) => {
                    expect(() => {
                        const reader = new BinaryFileReader(buffer);
                        const tji = reader.getTrajectoryFileInfo();
                        expect(tji).toHaveProperty("totalSteps", 1);
                        const plotData = reader.getPlotData();
                        expect(plotData).toHaveProperty("baz", "bat");
                        const nframes = reader.getNumFrames();
                        expect(nframes).toBe(0);
                    }).not.toThrow();
                });
            }
        );
    });
});
