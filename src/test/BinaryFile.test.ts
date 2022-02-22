import BinaryFileReader from "../simularium/BinaryFileParser";
import { isBinarySimulariumFile } from "../util";

function pad(buf: ArrayBuffer): ArrayBuffer {
    if (buf.byteLength % 4 !== 0) {
        const newbuf = new ArrayBuffer(
            buf.byteLength + (4 - (buf.byteLength % 4))
        );
        new Uint8Array(newbuf).set(new Uint8Array(buf));
        // unnecessary, because ArrayBuffer is initialized to 0
        // new Uint8Array(newbuf, buf.byteLength).fill(0);
        return newbuf;
    } else return buf;
}
function makeBinary(blocks: ArrayBuffer[], blockTypes: number[]): ArrayBuffer {
    const numBlocks = blocks.length;
    const headerfixedLen = 16 + 4 + 4 + 4;
    const tocLen = 3 * numBlocks * 4;
    const headerLen = headerfixedLen + tocLen;
    // extra 4 for block size and 4 for type
    const blockDataLen = blocks.reduce(
        (acc, block) => acc + block.byteLength + 4 + 4,
        0
    );
    const blockOffsets = [headerLen];
    for (let i = 1; i < numBlocks; i++) {
        blockOffsets.push(blockOffsets[i - 1] + blocks[i - 1].byteLength);
    }

    const buffer = new ArrayBuffer(headerfixedLen + tocLen + blockDataLen);
    const view = new Uint8Array(buffer);
    const view32 = new Uint32Array(buffer);
    view.set("SIMULARIUMBINARY".split("").map((c) => c.charCodeAt(0)));
    const headerview32 = new Uint32Array(buffer, 16);
    headerview32[0] = headerfixedLen + tocLen;
    headerview32[1] = 1;
    headerview32[2] = numBlocks;
    for (let i = 0; i < numBlocks; i++) {
        // blockoffset
        headerview32[3 + i * 3 + 0] = blockOffsets[i];
        // blocktype
        headerview32[3 + i * 3 + 1] = blockTypes[i];
        // blocksize
        headerview32[3 + i * 3 + 2] = blocks[i].byteLength + 4 + 4;
        // write block itself:
        view32[blockOffsets[i] / 4] = blockTypes[i];
        view32[blockOffsets[i] / 4 + 1] = blocks[i].byteLength + 4 + 4;
        view.set(new Uint8Array(blocks[i]), blockOffsets[i] + 4 + 4);
    }

    return buffer;
}

describe("binary simularium files", () => {
    test("it correctly identifies a binary simularium file signature", () => {
        const file = new Blob(["SIMULARIUMBINARY"]);
        return isBinarySimulariumFile(file).then((isBinary) => {
            expect(isBinary).toBe(true);
        });
    });
    test("it correctly identifies an invalid binary simularium file signature", () => {
        const file = new Blob(["SIMULARIUMBINAR"]);
        return isBinarySimulariumFile(file).then((isBinary) => {
            expect(isBinary).toBe(false);
        });
    });
    // build a header with no blocks.
    test("it correctly fails to read a file with no blocks", () => {
        const buffer = makeBinary([], []);
        const file = new Blob([buffer]);
        return isBinarySimulariumFile(file).then((isBinary) => {
            expect(isBinary).toBe(true);
            file.arrayBuffer().then((buffer) => {
                expect(() => {
                    new BinaryFileReader(buffer);
                }).toThrow();
            });
        });
    });
    test("it throws when a spatial data block is missing", () => {
        const json = '{"foo":"bar"}';
        const buffer = makeBinary([pad(new TextEncoder().encode(json))], [1]);
        const file = new Blob([buffer]);
        return isBinarySimulariumFile(file).then((isBinary) => {
            expect(isBinary).toBe(true);
            file.arrayBuffer().then((buffer) => {
                expect(() => {
                    new BinaryFileReader(buffer);
                }).toThrow("No spatial data block found");
            });
        });
    });
    // test("it correctly reads a file with one json block and one spatial block", () => {
    //     const json = '{"foo":"bar"}';
    //     const buffer = makeBinary(
    //         [pad(new TextEncoder().encode(json)), pad(new ArrayBuffer(8))],
    //         [1, 3]
    //     );
    //     const file = new Blob([buffer]);
    //     return isBinarySimulariumFile(file).then((isBinary) => {
    //         expect(isBinary).toBe(true);
    //         file.arrayBuffer().then((buffer) => {
    //             expect(() => {
    //                 new BinaryFileReader(buffer);
    //             }).not.toThrow();
    //         });
    //     });
    // });
});
