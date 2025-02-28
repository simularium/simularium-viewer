import { VisDataMessage, AGENT_OBJECT_KEYS, CachedFrame } from "./types.js";
import { FrontEndError, ErrorLevel } from "./FrontEndError.js";
import { AGENT_HEADER_SIZE } from "../constants.js";

const FRAME_DATA_SIZE = AGENT_OBJECT_KEYS.length;

/**
 * This function serves as a translation layer, it takes in a VisDataMessage
 * and walks the data counting the agents and converting the number[] to ArrayBuffer
 * in order to generate a CachedFrame.
 *
 * This is used for loading local JSON files, and in the rare case
 * that JSON is sent from the backend. Parsing twice (number[] to ArrayBuffer,
 * ArrayBuffer to AgentData) is a low concern for performance
 * as local files will automatically pre-cache frames and not deal with
 * network latency.
 *
 * todo: VisDataMessage.bundleData should only ever be a single frame
 * regardless of whether or not the data is JSON or binary, so we
 * should be able to adjust the typing of VisDataMessage to reflect that.
 */

function parseVisDataMessage(visDataMsg: VisDataMessage): CachedFrame {
    const frame = visDataMsg.bundleData[0];
    const visData = [...frame.data];

    let nSubPoints = visData[AGENT_OBJECT_KEYS.indexOf("nSubPoints")];
    let chunkLength = FRAME_DATA_SIZE + nSubPoints;

    // make ArrayBuffer from number[] to use in cache
    const totalSize = calculateBufferSize(frame.data);
    const buffer = new ArrayBuffer(totalSize);
    const view = new Float32Array(buffer);

    let agentCount = 0;
    let offset = 0;
    let currentAgentData = visData.slice(offset, offset + chunkLength);
    while (currentAgentData.length) {
        let writeIndex = AGENT_HEADER_SIZE + offset;
        let readIndex = offset;
        if (currentAgentData.length < chunkLength) {
            throw new FrontEndError(
                `Your data is malformed, there are too few entries. Found ${currentAgentData.length} entries, expected ${chunkLength}.`,
                ErrorLevel.ERROR
            );
        }

        agentCount++;

        // Copy agent data
        const agentData = frame.data.slice(
            readIndex,
            readIndex + FRAME_DATA_SIZE
        );
        view.set(agentData, writeIndex);
        readIndex += FRAME_DATA_SIZE;
        writeIndex += FRAME_DATA_SIZE;

        // Validate data integrity
        if (readIndex + nSubPoints > frame.data.length) {
            throw new FrontEndError(
                `Your data is malformed, there are too few entries. Found ${
                    frame.data.length
                }, expected ${readIndex + nSubPoints}.`,
                ErrorLevel.ERROR
            );
        }

        // Copy subpoints
        const subpoints = frame.data.slice(readIndex, readIndex + nSubPoints);
        view.set(subpoints, writeIndex);
        readIndex += nSubPoints;
        writeIndex += nSubPoints;

        // Adjust offsets relative to next agent's # of subpoints
        offset += chunkLength;
        nSubPoints = visData[offset + AGENT_OBJECT_KEYS.indexOf("nSubPoints")];
        chunkLength = FRAME_DATA_SIZE + nSubPoints;
        currentAgentData = visData.slice(offset, offset + chunkLength);
    }

    // Write header data
    view[0] = frame.frameNumber;
    view[1] = frame.time;
    view[2] = agentCount;

    const arrayBuffer: ArrayBuffer = view.buffer;
    const frameData: CachedFrame = {
        data: arrayBuffer,
        frameNumber: frame.frameNumber,
        time: frame.time,
        agentCount: agentCount,
        size: totalSize,
    };

    return frameData;
}

function calculateBufferSize(data: number[]): number {
    let size = AGENT_HEADER_SIZE * 4; // Header size in bytes
    let index = 0;

    while (index < data.length) {
        size += FRAME_DATA_SIZE * 4; // Agent header size in bytes
        const nSubPoints =
            data[index + AGENT_OBJECT_KEYS.indexOf("nSubPoints")];
        size += nSubPoints * 4; // Subpoints size in bytes
        index += FRAME_DATA_SIZE + nSubPoints;
    }

    return size;
}

export { parseVisDataMessage, calculateBufferSize };
