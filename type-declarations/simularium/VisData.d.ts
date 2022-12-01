import { TrajectoryFileInfo, EncodedTypeMapping, VisDataMessage } from "./types";
/**
 * Parse Agents from Net Data
 * */
export interface AgentData {
    x: number;
    y: number;
    z: number;
    xrot: number;
    yrot: number;
    zrot: number;
    instanceId: number;
    ["vis-type"]: number;
    type: number;
    cr: number;
    subpoints: number[];
}
interface FrameData {
    frameNumber: number;
    time: number;
}
interface ParsedBundle {
    frameDataArray: FrameData[];
    parsedAgentDataArray: AgentData[][];
}
declare class VisData {
    private frameCache;
    private frameDataCache;
    private webWorker;
    private frameToWaitFor;
    private lockedForFrame;
    private cacheFrame;
    private netBuffer;
    private _dragAndDropFileInfo;
    firstFrameTime: number | null;
    timeStepSize: number;
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
    static parse(visDataMsg: VisDataMessage): ParsedBundle;
    private static parseOneBinaryFrame;
    static parseBinary(data: ArrayBuffer): ParsedBundle;
    private setupWebWorker;
    constructor();
    get currentFrameData(): FrameData;
    /**
     *   Functions to check update
     * */
    hasLocalCacheForTime(time: number): boolean;
    gotoTime(time: number): void;
    atLatestFrame(): boolean;
    currentFrame(): AgentData[];
    gotoNextFrame(): void;
    /**
     * Data management
     * */
    WaitForFrame(frameNumber: number): void;
    clearCache(): void;
    clearForNewTrajectory(): void;
    cancelAllWorkers(): void;
    private addFramesToCache;
    private parseAgentsFromVisDataMessage;
    parseAgentsFromLocalFileData(msg: VisDataMessage | ArrayBuffer): void;
    parseAgentsFromNetData(msg: VisDataMessage | ArrayBuffer): void;
    private parseBinaryNetData;
    cacheJSON(visDataMsg: VisDataMessage): void;
    set dragAndDropFileInfo(fileInfo: TrajectoryFileInfo | null);
    get dragAndDropFileInfo(): TrajectoryFileInfo | null;
    checkTypeMapping(typeMappingFromFile: EncodedTypeMapping): number[];
    convertVisDataWorkFunctionToString(): string;
}
export { VisData };
export default VisData;
