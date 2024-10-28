import { VisDataMessage, CachedFrame } from "./types";
import { VisDataCache } from "./VisDataCache";
import { FrontEndError } from "./FrontEndError";
declare class VisData {
    frameCache: VisDataCache;
    private frameToWaitFor;
    private lockedForFrame;
    private currentFrameNumber;
    timeStepSize: number;
    onError: (error: FrontEndError) => void;
    private static parseOneBinaryFrame;
    constructor();
    setOnError(onError: (error: FrontEndError) => void): void;
    get currentFrameData(): CachedFrame;
    /**
     *   Functions to check update
     * */
    hasLocalCacheForTime(time: number): boolean;
    gotoTime(time: number): void;
    atLatestFrame(): boolean;
    gotoNextFrame(): void;
    /**
     * Data management
     * */
    WaitForFrame(frameNumber: number): void;
    clearCache(): void;
    clearForNewTrajectory(): void;
    private parseAgentsFromVisDataMessage;
    parseAgentsFromFrameData(msg: VisDataMessage | ArrayBuffer): void;
    parseAgentsFromNetData(msg: VisDataMessage | ArrayBuffer): void;
    private addFrameToCache;
    private frameExceedsCacheSizeError;
}
export { VisData };
export default VisData;
