import type ISimulariumFile from "./ISimulariumFile";
import type { TrajectoryFileInfo, VisDataFrame } from "./types";
import { compareTimes } from "../util";

const enum BlockTypeEnum {
    // type = 0 : spatial data block in JSON
    SPATIAL_DATA_JSON = 0,
    // type = 1 : trajectory info block in JSON
    TRAJECTORY_INFO_JSON = 1,
    // type = 2 : plot data block in JSON
    PLOT_DATA_JSON = 2,
    // type = 3 : spatial data block in binary
    SPATIAL_DATA_BINARY = 3,
}

interface BlockInfo {
    type: BlockTypeEnum;
    offset: number;
    size: number;
}
interface Header {
    version: number;
    blocks: BlockInfo[];
}
const SECRET = "SIMULARIUMBINARY";

// each block has a type and a size
const BLOCK_HEADER_SIZE = 8;

export default class BinaryFileReader implements ISimulariumFile {
    fileContents: ArrayBuffer;
    dataView: DataView;
    header: Header;
    tfi: TrajectoryFileInfo;
    nFrames: number;
    frameOffsets: number[];
    spatialData: Float32Array;
    constructor(fileContents: ArrayBuffer) {
        this.nFrames = 0;
        this.frameOffsets = [];
        this.fileContents = fileContents;
        this.dataView = new DataView(fileContents);
        this.header = this.readHeader();
        this.tfi = this.getTrajectoryFileInfo();
        this.spatialData = this.readSpatialDataInfo();
    }

    private readSpatialDataInfo(): Float32Array {
        // find spatial data block and load frame offsets
        for (const block of this.header.blocks) {
            if (block.type === BlockTypeEnum.SPATIAL_DATA_BINARY) {
                const blockData = this.getBlock(block);
                // Spatial data version (4-byte int)
                const version = blockData.getInt32(0, true);
                // Number of frames (4-byte int)
                this.nFrames = blockData.getInt32(4, true);
                // Frame offsets (Number of frames * 4-byte int)
                for (let i = 0; i < this.nFrames; i++) {
                    this.frameOffsets.push(blockData.getInt32(8 + i * 4, true));
                }
                return new Float32Array(
                    blockData.buffer,
                    blockData.byteOffset,
                    blockData.byteLength
                );
            }
        }
        throw new Error("No spatial data block found");
    }

    private readHeader(): Header {
        // could use DataView here but I know every header field is int32
        const asints = new Int32Array(this.fileContents, SECRET.length);
        // TODO validate header length
        const headerLength = asints[0];
        const headerVersion = asints[1];
        const nBlocks = asints[2];
        if (nBlocks < 1) {
            throw new Error("No blocks found in file");
        }
        const blocks: BlockInfo[] = [];
        for (let i = 0; i < nBlocks; i++) {
            blocks.push({
                offset: asints[3 + i * 3 + 0],
                type: asints[3 + i * 3 + 1],
                size: asints[3 + i * 3 + 2],
            });
        }
        if (blocks[0].offset !== headerLength) {
            throw new Error("First block offset does not match header length");
        }
        return {
            version: headerVersion,
            blocks,
        };
    }

    private getBlock(block: BlockInfo): DataView {
        // first validate the block with what we expect.

        // TAKE NOTE OF ENDIANNESS. IS SIMULARIUMBINARY ALWAYS LITTLE ENDIAN?
        // ERROR size, type IN WRONG ORDER
        // ERROR BLOCK OFFSET WAS STORED HERE, NOT SIZE
        const blockSize = this.dataView.getInt32(block.offset, true);
        const blockType = this.dataView.getInt32(block.offset + 4, true);

        if (blockType !== block.type) {
            throw new Error(
                "Block type mismatch.  Header says " +
                    block.type +
                    " but block says " +
                    blockType
            );
        }
        if (blockSize !== block.size) {
            throw new Error(
                "Block size mismatch.  Header says " +
                    block.size +
                    " but block says " +
                    blockSize
            );
        }
        // note: NOT a copy.
        // never produce copies internally. let callers make a copy if they need it.
        // also note: return the contents of the block NOT INCLUDING the block header
        return new DataView(
            this.fileContents,
            block.offset + BLOCK_HEADER_SIZE,
            block.size - BLOCK_HEADER_SIZE
        );
    }

    getTrajectoryFileInfo(): TrajectoryFileInfo {
        // find the first block that is a trajectory info block
        for (const block of this.header.blocks) {
            if (block.type === BlockTypeEnum.TRAJECTORY_INFO_JSON) {
                const blockData = this.getBlock(block);
                const enc = new TextDecoder("utf-8");
                const text = enc.decode(blockData);
                const json = JSON.parse(text);
                // TODO ???
                // const trajectoryFileInfo: TrajectoryFileInfo =
                //     updateTrajectoryFileInfoFormat(json, onError);
                return json as TrajectoryFileInfo;
            }
        }
        throw new Error("No trajectory info block found");
    }

    getNumFrames(): number {
        return this.nFrames;
    }

    getFrameIndexAtTime(time: number): number {
        const { timeStepSize } = this.tfi;
        // Find the index of the frame that has the time matching our target time:
        // walk offsets and parse frame times.
        // assumes frames are in ascending order by time!
        for (let i = 0; i < this.nFrames; i++) {
            // get time of frame.
            const frameFloatOffset = this.frameOffsets[i] / 4;
            const frameNumber = this.spatialData[frameFloatOffset + 0];
            const frameTime = this.spatialData[frameFloatOffset + 1];
            // check time
            if (compareTimes(frameTime, time, timeStepSize) === 0) {
                return i;
            }
        }

        return -1;
    }

    getFrame(theFrameNumber: number): VisDataFrame | ArrayBuffer {
        const frameOffset = this.frameOffsets[theFrameNumber];
        const totalOffset = this.spatialData.byteOffset + frameOffset;
        const frameSize = this.spatialData[totalOffset / 4 + 0];
        // return an arraybuffer copy?
        const frameContents = this.fileContents.slice(totalOffset, frameSize);
        return frameContents;
    }
}
