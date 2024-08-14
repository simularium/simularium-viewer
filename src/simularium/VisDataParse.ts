import { VisDataMessage, AGENT_OBJECT_KEYS, CachedFrame } from "./types";
import { FrontEndError, ErrorLevel } from "./FrontEndError";

// to do think about the purpose of this file if we aren't parsing upfront

/**
 *   Parses a stream of data sent from the backend
 *
 *   To minimize bandwidth, traits/objects are not packed
 *   1-1; what arrives is an array of float values
 *
 *   For instance for:
 *   entity = (
 *        trait1 : 4,
 *        trait2 : 5,
 *        trait3 : 6,
 *    ) ...
 *
 *   what arrives will be:
 *       [...,4,5,6,...]
 *
 *   The traits are assumed to be variable in length,
 *   and the alorithm to decode them needs to the reverse
 *   of the algorithm that packed them on the backend
 *
 *   This is more convuluted than sending the JSON objects themselves,
 *   however these frames arrive multiple times per second. Even a naive
 *   packing reduces the packet size by ~50%, reducing how much needs to
 *   paid for network bandwith (and improving the quality & responsiveness
 *   of the application, since network latency is a major bottle-neck)
 * */

// function parseVisDataMessage(visDataMsg: VisDataMessage): CachedFrame {
//     const cachedFrame: CachedFrame = {
//         agentData: [],
//         frameData: { frameNumber: 0, time: 0 },
//         size: 0,
//     };
//     visDataMsg.bundleData.forEach((frame) => {
//         const visData = frame.data;
//         const parsedAgentData: AgentData[] = [];
//         const nSubPointsIndex = AGENT_OBJECT_KEYS.findIndex(
//             (ele) => ele === "nSubPoints"
//         );

//         const parseOneAgent = (agentArray): AgentData => {
//             return agentArray.reduce(
//                 (agentData, cur, i) => {
//                     let key;
//                     if (AGENT_OBJECT_KEYS[i]) {
//                         key = AGENT_OBJECT_KEYS[i];
//                         agentData[key] = cur;
//                     } else if (i < agentArray.length + agentData.nSubPoints) {
//                         agentData.subpoints.push(cur);
//                     }
//                     return agentData;
//                 },
//                 { subpoints: [] }
//             );
//         };

//         while (visData.length) {
//             const nSubPoints = visData[nSubPointsIndex];
//             const chunkLength = AGENT_OBJECT_KEYS.length + nSubPoints; // each array length is variable based on how many subpoints the agent has
//             if (visData.length < chunkLength) {
//                 const attemptedMapping = AGENT_OBJECT_KEYS.map(
//                     (name, index) => `${name}: ${visData[index]}<br />`
//                 );
//                 // will be caught by controller.changeFile(...).catch()
//                 throw new FrontEndError(
//                     "Your data is malformed, there are too few entries.",
//                     ErrorLevel.ERROR,
//                     `Example attempt to parse your data: <pre>${attemptedMapping.join(
//                         ""
//                     )}</pre>`
//                 );
//             }

//             const agentSubSetArray = visData.splice(0, chunkLength); // cut off the array of 1 agent data from front of the array;
//             if (agentSubSetArray.length < AGENT_OBJECT_KEYS.length) {
//                 const attemptedMapping = AGENT_OBJECT_KEYS.map(
//                     (name, index) => `${name}: ${agentSubSetArray[index]}<br />`
//                 );
//                 // will be caught by controller.changeFile(...).catch()
//                 throw new FrontEndError(
//                     "Your data is malformed, there are less entries than expected for this agent. ",
//                     ErrorLevel.ERROR,
//                     `Example attempt to parse your data: <pre>${attemptedMapping.join(
//                         ""
//                     )}</pre>`
//                 );
//             }

//             const agent = parseOneAgent(agentSubSetArray);
//             parsedAgentData.push(agent);
//         }

//         const frameData: FrameData = {
//             time: frame.time,
//             frameNumber: frame.frameNumber,
//         };

//         const cachedSize = calculateCachedSize(parsedAgentData);
//         cachedFrame.agentData = parsedAgentData;
//         cachedFrame.frameData = frameData;

//         cachedFrame.size = cachedSize;
//     });
//     return cachedFrame;
// }

// const AGENT_OBJECT_KEYS = [
//     "x",
//     "y",
//     "z",
//     "visType",
//     "type",
//     "instanceId",
//     "nSubPoints",
// ];
const HEADER_SIZE = 3; // frameNumber, time, agentCount
const AGENT_HEADER_SIZE = AGENT_OBJECT_KEYS.length;

function parseVisDataMessage(visDataMsg: VisDataMessage): CachedFrame {
    // Assuming visDataMsg.bundleData has only one frame for simplicity
    // If multiple frames are possible, you'd need to handle that case
    const frame = visDataMsg.bundleData[0];

    // Calculate total size needed for the buffer
    const totalSize = calculateBufferSize(frame.data);

    // Create a new ArrayBuffer to hold all the data
    const buffer = new ArrayBuffer(totalSize);
    const view = new Float32Array(buffer);

    // Write header data
    view[0] = frame.frameNumber;
    view[1] = frame.time;
    view[2] = frame.data.length / (AGENT_HEADER_SIZE + 1); // Estimating agent count

    let writeIndex = HEADER_SIZE;
    let readIndex = 0;

    while (readIndex < frame.data.length) {
        // Copy agent data
        for (let i = 0; i < AGENT_HEADER_SIZE; i++) {
            view[writeIndex++] = frame.data[readIndex++];
        }

        const nSubPoints = frame.data[readIndex - 1];

        // Validate data integrity
        if (readIndex + nSubPoints > frame.data.length) {
            throw new FrontEndError(
                "Your data is malformed, there are too few entries.",
                ErrorLevel.ERROR,
                `Attempted to read ${nSubPoints} subpoints, but only ${
                    frame.data.length - readIndex
                } entries remain.`
            );
        }

        // Copy subpoints
        for (let i = 0; i < nSubPoints; i++) {
            view[writeIndex++] = frame.data[readIndex++];
        }
    }

    const frameData: CachedFrame = {
        data: buffer,
        frameNumber: frame.frameNumber,
        time: frame.time,
        agentCount: view[2],
        size: totalSize,
    };

    return frameData;
}

function calculateBufferSize(data: number[]): number {
    let size = HEADER_SIZE * 4; // Header size in bytes
    let index = 0;

    while (index < data.length) {
        size += AGENT_HEADER_SIZE * 4; // Agent header size in bytes
        const nSubPoints = data[index + AGENT_HEADER_SIZE - 1];
        size += nSubPoints * 4; // Subpoints size in bytes
        index += AGENT_HEADER_SIZE + nSubPoints;
    }

    return size;
}

export { parseVisDataMessage };
// export type { ParsedBundle };
