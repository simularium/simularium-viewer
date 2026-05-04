import { VisDataMessage, AGENT_OBJECT_KEYS, CachedFrame } from "./types.js";
import { FrontEndError, ErrorLevel } from "./FrontEndError.js";
import { AGENT_HEADER_SIZE } from "../constants.js";

const FRAME_DATA_SIZE = AGENT_OBJECT_KEYS.length;
const N_SUBPOINTS_INDEX = AGENT_OBJECT_KEYS.indexOf("nSubPoints");

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
 * Internal CachedFrame layout per agent (always):
 *   [ AGENT_OBJECT_KEYS fields | subpoints[nSubPoints] | nFeatures | features[nFeatures] ]
 *
 * For trajectory format versions < 4 (no features), the source data only
 * carries the fixed fields and subpoints; we inject nFeatures=0 per agent.
 *
 * todo: VisDataMessage.bundleData should only ever be a single frame
 * regardless of whether or not the data is JSON or binary, so we
 * should be able to adjust the typing of VisDataMessage to reflect that.
 */

function parseVisDataMessage(
    visDataMsg: VisDataMessage,
    hasFeatures = false
): CachedFrame {
    const frame = visDataMsg.bundleData[0];
    const visData = frame.data;

    // make ArrayBuffer from number[] to use in cache
    const totalSize = calculateBufferSize(visData, hasFeatures);
    const buffer = new ArrayBuffer(totalSize);
    const view = new Float32Array(buffer);

    let agentCount = 0;
    let readIndex = 0;
    let writeIndex = AGENT_HEADER_SIZE;

    while (readIndex < visData.length) {
        if (readIndex + FRAME_DATA_SIZE > visData.length) {
            throw new FrontEndError(
                `Your data is malformed: not enough entries for an agent header. ` +
                    `Found ${
                        visData.length - readIndex
                    }, expected ${FRAME_DATA_SIZE}.`,
                ErrorLevel.ERROR
            );
        }

        const nSubPoints = visData[readIndex + N_SUBPOINTS_INDEX];

        // Copy the AGENT_OBJECT_KEYS fields
        for (let i = 0; i < FRAME_DATA_SIZE; i++) {
            view[writeIndex + i] = visData[readIndex + i];
        }
        writeIndex += FRAME_DATA_SIZE;
        readIndex += FRAME_DATA_SIZE;

        // Copy subpoints
        if (readIndex + nSubPoints > visData.length) {
            throw new FrontEndError(
                `Your data is malformed: not enough entries for subpoints. ` +
                    `Found ${visData.length}, expected ${
                        readIndex + nSubPoints
                    }.`,
                ErrorLevel.ERROR
            );
        }
        for (let i = 0; i < nSubPoints; i++) {
            view[writeIndex + i] = visData[readIndex + i];
        }
        writeIndex += nSubPoints;
        readIndex += nSubPoints;

        // Read or inject nFeatures + features
        let nFeatures = 0;
        if (hasFeatures) {
            if (readIndex + 1 > visData.length) {
                throw new FrontEndError(
                    `Your data is malformed: missing nFeatures.`,
                    ErrorLevel.ERROR
                );
            }
            nFeatures = visData[readIndex];
            readIndex += 1;
        }
        view[writeIndex] = nFeatures;
        writeIndex += 1;

        if (hasFeatures && nFeatures > 0) {
            if (readIndex + nFeatures > visData.length) {
                throw new FrontEndError(
                    `Your data is malformed: not enough entries for features. ` +
                        `Found ${visData.length}, expected ${
                            readIndex + nFeatures
                        }.`,
                    ErrorLevel.ERROR
                );
            }
            for (let i = 0; i < nFeatures; i++) {
                view[writeIndex + i] = visData[readIndex + i];
            }
            writeIndex += nFeatures;
            readIndex += nFeatures;
        }

        agentCount++;
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

function calculateBufferSize(data: number[], hasFeatures = false): number {
    let size = AGENT_HEADER_SIZE * 4; // Header size in bytes
    let index = 0;

    while (index < data.length) {
        size += FRAME_DATA_SIZE * 4; // Agent fixed-fields size in bytes
        const nSubPoints = data[index + N_SUBPOINTS_INDEX];
        size += nSubPoints * 4; // Subpoints size in bytes
        index += FRAME_DATA_SIZE + nSubPoints;

        // nFeatures slot is always present in the internal buffer.
        size += 4;
        if (hasFeatures) {
            const nFeatures = data[index];
            index += 1;
            size += nFeatures * 4;
            index += nFeatures;
        }
    }

    return size;
}

export { parseVisDataMessage, calculateBufferSize };
