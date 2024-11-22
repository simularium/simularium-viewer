import {
    FrameData,
    VisDataMessage,
    AgentData,
    AGENT_OBJECT_KEYS,
} from "./types.js";
import { FrontEndError, ErrorLevel } from "./FrontEndError.js";

interface ParsedBundle {
    frameDataArray: FrameData[];
    parsedAgentDataArray: AgentData[][];
}

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

function parseVisDataMessage(visDataMsg: VisDataMessage): ParsedBundle {
    const parsedAgentDataArray: AgentData[][] = [];
    const frameDataArray: FrameData[] = [];
    visDataMsg.bundleData.forEach((frame) => {
        const visData = frame.data;
        const parsedAgentData: AgentData[] = [];
        const nSubPointsIndex = AGENT_OBJECT_KEYS.findIndex(
            (ele) => ele === "nSubPoints"
        );

        const parseOneAgent = (agentArray): AgentData => {
            return agentArray.reduce(
                (agentData, cur, i) => {
                    let key;
                    if (AGENT_OBJECT_KEYS[i]) {
                        key = AGENT_OBJECT_KEYS[i];
                        agentData[key] = cur;
                    } else if (i < agentArray.length + agentData.nSubPoints) {
                        agentData.subpoints.push(cur);
                    }
                    return agentData;
                },
                { subpoints: [] }
            );
        };

        while (visData.length) {
            const nSubPoints = visData[nSubPointsIndex];
            const chunkLength = AGENT_OBJECT_KEYS.length + nSubPoints; // each array length is variable based on how many subpoints the agent has
            if (visData.length < chunkLength) {
                const attemptedMapping = AGENT_OBJECT_KEYS.map(
                    (name, index) => `${name}: ${visData[index]}<br />`
                );
                // will be caught by controller.changeFile(...).catch()
                throw new FrontEndError(
                    "Your data is malformed, there are too few entries.",
                    ErrorLevel.ERROR,
                    `Example attempt to parse your data: <pre>${attemptedMapping.join(
                        ""
                    )}</pre>`
                );
            }

            const agentSubSetArray = visData.splice(0, chunkLength); // cut off the array of 1 agent data from front of the array;
            if (agentSubSetArray.length < AGENT_OBJECT_KEYS.length) {
                const attemptedMapping = AGENT_OBJECT_KEYS.map(
                    (name, index) => `${name}: ${agentSubSetArray[index]}<br />`
                );
                // will be caught by controller.changeFile(...).catch()
                throw new FrontEndError(
                    "Your data is malformed, there are less entries than expected for this agent. ",
                    ErrorLevel.ERROR,
                    `Example attempt to parse your data: <pre>${attemptedMapping.join(
                        ""
                    )}</pre>`
                );
            }

            const agent = parseOneAgent(agentSubSetArray);
            parsedAgentData.push(agent);
        }

        const frameData: FrameData = {
            time: frame.time,
            frameNumber: frame.frameNumber,
        };

        parsedAgentDataArray.push(parsedAgentData);
        frameDataArray.push(frameData);
    });

    return {
        parsedAgentDataArray,
        frameDataArray,
    };
}

export { parseVisDataMessage };
export type { ParsedBundle };
