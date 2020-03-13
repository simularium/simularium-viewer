/**
    * Parse Agents from Net Data
* */
declare class VisData {
    private frameCache;
    private frameDataCache;
    private webWorker;
    private frameToWaitFor;
    private lockedForFrame;
    private cacheFrame;
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
    static parse(visDataMsg: any): {
        frameData: {
            time: any;
            frameNumber: any;
        };
        parsedAgentData: any;
    };
    constructor();
    readonly currentFrameData: any;
    /**
    *   Functions to check update
    * */
    hasLocalCacheForTime(timeNs: any): boolean;
    gotoTime(timeNs: any): void;
    atLatestFrame(): boolean;
    currentFrame(): any;
    gotoNextFrame(): void;
    /**
    * Data management
    * */
    WaitForFrame(frameNumber: any): void;
    clearCache(): void;
    parseAgentsFromNetData(visDataMsg: any): void;
    convertVisDataWorkFunctionToString(): string;
}
export { VisData };
export default VisData;
