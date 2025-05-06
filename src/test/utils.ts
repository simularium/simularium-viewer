// utils for making binary data for testing BinaryFileReader and Simularium Controller
export function pad(buf: ArrayBuffer): ArrayBuffer {
    if (buf.byteLength % 4 !== 0) {
        const newbuf = new ArrayBuffer(
            buf.byteLength + (4 - (buf.byteLength % 4))
        );
        new Uint8Array(newbuf).set(new Uint8Array(buf));
        return newbuf;
    } else return buf;
}
export function makeBinary(
    blocks: ArrayBuffer[],
    blockTypes: number[]
): ArrayBuffer {
    const numBlocks = blocks.length;
    const headerfixedLen = 16 + 4 + 4 + 4;
    const tocLen = 3 * numBlocks * 4;
    const headerLen = headerfixedLen + tocLen;
    // extra 4 for block size and 4 for type
    const blockDataLen = blocks.reduce(
        (acc, block) => acc + (block.byteLength + 4 + 4),
        0
    );
    const blockOffsets = [headerLen];
    for (let i = 1; i < numBlocks; i++) {
        blockOffsets.push(
            blockOffsets[i - 1] + (blocks[i - 1].byteLength + 4 + 4)
        );
    }
    // enough space for the whole thing
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
