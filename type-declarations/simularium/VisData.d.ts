import { VisDataMessage, CachedFrame } from "./types.js";
import { VisDataCache } from "./VisDataCache.js";
import { FrontEndError } from "./FrontEndError.js";
declare class VisData {
    frameCache: VisDataCache;
    private frameToWaitFor;
    private lockedForFrame;
    currentFrameNumber: number;
    currentStreamingHead: number;
    remoteStreamingHeadPotentiallyOutOfSync: boolean;
    isPlaying: boolean;
    onCacheLimitReached: () => void;
    timeStepSize: number;
    totalSteps: number;
    onError: (error: FrontEndError) => void;
    private static parseOneBinaryFrame;
    constructor();
    setOnError(onError: (error: FrontEndError) => void): void;
    setOnCacheLimitReached(onCacheLimitReached: () => void): void;
    get currentFrameData(): CachedFrame;
    /**
     *   Functions to check update
     * */
    hasLocalCacheForTime(time: number): boolean;
    hasLocalCacheForFrame(frameNumber: number): boolean;
    gotoTime(time: number): void;
    gotoFrame(frameNumber: number): void;
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
    private handleOversizedFrame;
    private trimAndAddFrame;
    private resetCacheWithFrame;
    private doesFrameCauseCacheOverflow;
    private handleCacheOverflow;
    private validateAndProcessFrame;
    private addFrameToCache;
    private frameExceedsCacheSizeError;
}
export { VisData };
export default VisData;
