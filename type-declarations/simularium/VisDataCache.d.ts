import { CachedFrame, CacheLog } from "./types.js";
interface VisDataCacheSettings {
    maxSize: number;
    cacheEnabled: boolean;
    onUpdate?: (log: CacheLog) => void;
}
declare class VisDataCache {
    private head;
    private tail;
    numFrames: number;
    size: number;
    private _maxSize;
    private _cacheEnabled;
    private cacheUpdateCallback;
    constructor(settings?: Partial<VisDataCacheSettings>);
    changeSettings(options: {
        maxSize?: number;
        cacheEnabled?: boolean;
        onUpdate?: (log: CacheLog) => void;
    }): void;
    onCacheUpdate(): void;
    private getListOfCachedFrameNumbers;
    get maxSize(): number;
    get cacheEnabled(): boolean;
    get cacheSizeLimited(): boolean;
    hasFrames(): boolean;
    /**
     * Walks the cache looking for node that satisfies condition
     * returns the node if found, otherwise returns null,
     * starts at head if firstNode is not provided.
     */
    private findInLinkedList;
    containsTime(time: number): boolean;
    containsFrameAtFrameNumber(frameNumber: number): boolean;
    getFirstFrame(): CachedFrame | undefined;
    getFirstFrameNumber(): number;
    getFirstFrameTime(): number;
    getLastFrame(): CachedFrame | undefined;
    getLastFrameNumber(): number;
    getLastFrameTime(): number;
    private getFrameAtCondition;
    getFrameAtTime(time: number): CachedFrame | undefined;
    getFrameAtFrameNumber(frameNumber: number): CachedFrame | undefined;
    private assignSingleFrameToCache;
    private addFrameToEndOfCache;
    addFrame(data: CachedFrame): void;
    private removeNode;
    trimCache(incomingDataSize?: number): void;
    clear(): void;
}
export { VisDataCache };
