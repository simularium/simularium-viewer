import { CachedFrame } from "./types";
interface VisDataCacheSettings {
    maxSize: number;
    cacheEnabled: boolean;
}
declare class VisDataCache {
    private head;
    private tail;
    numFrames: number;
    size: number;
    private _maxSize;
    private _cacheEnabled;
    constructor(settings?: Partial<VisDataCacheSettings>);
    changeSettings(options: {
        maxSize?: number;
        cacheEnabled?: boolean;
    }): void;
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
    private trimCache;
    clear(): void;
}
export { VisDataCache };
