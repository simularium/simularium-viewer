import { VisDataMessage, CachedFrame } from "./types";
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
declare function parseVisDataMessage(visDataMsg: VisDataMessage): CachedFrame;
declare function calculateBufferSize(data: number[]): number;
export { parseVisDataMessage, calculateBufferSize };
