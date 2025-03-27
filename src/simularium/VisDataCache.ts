import { compareTimes } from "../util.js";
import { CachedFrame, CacheLog, CacheNode } from "./types.js";

interface VisDataCacheSettings {
    maxSize: number;
    cacheEnabled: boolean;
    onCacheUpdate?: (log: CacheLog) => void;
}

class VisDataCache {
    private head: CacheNode | null;
    private tail: CacheNode | null;
    public numFrames: number;
    public size: number;
    private _maxSize: number;
    private _cacheEnabled: boolean;
    private logCacheUpdate: ((log: CacheLog) => void) | null;

    constructor(settings?: Partial<VisDataCacheSettings>) {
        /**
         * maxSize of negative one means no limit on cache size
         * disabledCache means only one frame will be stored at a time
         * maxSize > 0 and cacheEnabled will cause cache to trim frames
         * when incoming frame pushes size over max
         */
        this.head = null;
        this.tail = null;
        this.numFrames = 0;
        this.size = 0;
        this._maxSize = Infinity;
        this._cacheEnabled = true;
        this.logCacheUpdate = null;

        if (settings) {
            this.changeSettings(settings);
        }
    }

    public changeSettings(options: {
        maxSize?: number;
        cacheEnabled?: boolean;
        onCacheUpdate?: (log: CacheLog) => void;
    }): void {
        const { maxSize, cacheEnabled, onCacheUpdate } = options;
        if (cacheEnabled !== undefined) {
            this._cacheEnabled = cacheEnabled;
        }
        if (maxSize !== undefined) {
            this._maxSize = maxSize;
        }
        if (onCacheUpdate !== undefined) {
            this.logCacheUpdate = onCacheUpdate;
        }
        this.onCacheUpdate();
    }

    public onCacheUpdate(): void {
        this.logCacheUpdate?.({
            size: this.size,
            framesInCache: this.getListOfCachedFrameNumbers(),
        });
    }

    private getListOfCachedFrameNumbers(): number[] {
        const frameNumbers: number[] = [];
        let current: CacheNode | null = this.head;
        while (current !== null) {
            frameNumbers.push(current.data.frameNumber);
            current = current.next;
        }
        return frameNumbers;
    }

    public get maxSize(): number {
        return this._maxSize;
    }

    public get cacheEnabled(): boolean {
        return this._cacheEnabled;
    }

    public get cacheSizeLimited(): boolean {
        return this._maxSize !== Infinity;
    }

    public hasFrames(): boolean {
        return this.numFrames > 0 && this.head !== null && this.tail !== null;
    }

    /**
     * Walks the cache looking for node that satisfies condition
     * returns the node if found, otherwise returns null,
     * starts at head if firstNode is not provided.
     */
    private findInLinkedList(
        condition: (data: CacheNode) => boolean,
        firstNode?: CacheNode
    ): CacheNode | undefined {
        let currentNode = firstNode || this.head;
        while (currentNode) {
            if (condition(currentNode)) {
                return currentNode;
            }
            currentNode = currentNode.next;
        }
        return undefined;
    }

    public containsTime(time: number): boolean {
        if (
            compareTimes(time, this.getFirstFrameTime(), 0.1) === -1 ||
            compareTimes(time, this.getLastFrameTime(), 0.1) === 1
        ) {
            return false;
        }
        if (time < this.getFirstFrameTime() || time > this.getLastFrameTime()) {
            return false;
        }
        return !!this.findInLinkedList((node) => node.data.time === time);
    }

    public containsFrameAtFrameNumber(frameNumber: number): boolean {
        if (
            frameNumber < this.getFirstFrameNumber() ||
            frameNumber > this.getLastFrameNumber()
        ) {
            return false;
        }
        return !!this.findInLinkedList(
            (node) => node.data.frameNumber === frameNumber
        );
    }

    public getFirstFrame(): CachedFrame | undefined {
        return this.head?.data;
    }

    public getFirstFrameNumber(): number {
        if (this.head !== null) {
            return this.head.data.frameNumber;
        }
        return -1;
    }

    public getFirstFrameTime(): number {
        return this.head?.data.time || -1;
    }

    public getLastFrame(): CachedFrame | undefined {
        return this.tail?.data;
    }

    public getLastFrameNumber(): number {
        if (this.tail !== null) {
            return this.tail.data.frameNumber;
        }
        return -1;
    }

    public getLastFrameTime(): number {
        return this.tail?.data.time || -1;
    }

    private getFrameAtCondition(
        condition: (data: CacheNode) => boolean
    ): CachedFrame | undefined {
        if (!this.head) {
            return;
        }
        const frame = this.findInLinkedList(condition);
        if (frame) {
            return frame.data;
        }
    }

    public getFrameAtTime(time: number): CachedFrame | undefined {
        const frame = this.getFrameAtCondition(
            (node) => compareTimes(node.data.time, time, 0) === 0
        );
        return frame ? frame : undefined;
    }

    public getFrameAtFrameNumber(frameNumber: number): CachedFrame | undefined {
        const frame = this.getFrameAtCondition(
            (node) => node.data["frameNumber"] === frameNumber
        );
        return frame ? frame : undefined;
    }

    private assignSingleFrameToCache(data: CachedFrame): void {
        const newNode: CacheNode = {
            data,
            next: null,
            prev: null,
        };

        this.head = newNode;
        this.tail = newNode;
        this.size = data.size;
        this.numFrames = 1;
        this.onCacheUpdate();
    }

    private addFrameToEndOfCache(data: CachedFrame): void {
        const newNode: CacheNode = {
            data,
            next: null,
            prev: null,
        };
        if (!this.hasFrames()) {
            this.assignSingleFrameToCache(data);
            return;
        }
        if (this.tail) {
            newNode.prev = this.tail;
            this.tail.next = newNode;
            this.tail = newNode;
            this.numFrames++;
            this.size += data.size;
            if (this.size > this._maxSize) {
                this.trimCache();
            }
        }
    }

    public addFrame(data: CachedFrame): void {
        if (this.size + data.size > this._maxSize) {
            this.trimCache(data.size);
        }
        if (this.hasFrames() && this._cacheEnabled) {
            this.addFrameToEndOfCache(data);
            this.onCacheUpdate();
            return;
        }
        this.assignSingleFrameToCache(data);
        this.onCacheUpdate();
    }

    // generalized to remove any node, but in theory
    // we should only be removing the head when we trim the cache
    // under current assumptions
    private removeNode(node: CacheNode): void {
        if (this.numFrames === 0 || !this.head || !this.tail) {
            return;
        }
        if (this.numFrames === 1 && this.head === this.tail) {
            this.clear();
            return;
        }
        if (node === this.head && node.next !== null) {
            this.head = node.next;
            this.head.prev = null;
        } else if (node === this.tail && node.prev !== null) {
            this.tail = node.prev;
            this.tail.next = null;
        } else if (node.prev !== null && node.next !== null) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
        }
        this.numFrames--;
        this.size -= node.data.size;
        this.onCacheUpdate();
    }

    private trimCache(incomingDataSize?: number): void {
        while (
            this.hasFrames() &&
            this.size + (incomingDataSize || 0) > this._maxSize &&
            this.head !== null
        ) {
            this.removeNode(this.head);
        }
    }

    public clear(): void {
        this.head = null;
        this.tail = null;
        this.numFrames = 0;
        this.size = 0;
        this.onCacheUpdate();
    }
}

export { VisDataCache };
