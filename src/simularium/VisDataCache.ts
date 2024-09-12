import { noop } from "lodash";
import { ErrorLevel, FrontEndError } from "./FrontEndError";
import { CachedFrame, LinkedListNode } from "./types";
import { nullCachedFrame } from "../util";

interface VisDataCacheSettings {
    maxSize: number;
    cacheEnabled: boolean;
}

class VisDataCache {
    public head: LinkedListNode | null;
    public tail: LinkedListNode | null;
    public numFrames: number;
    public size: number;
    public maxSize: number;
    public cacheEnabled: boolean;
    public cacheSizeLimited: boolean;

    public onError: (error: FrontEndError) => void;

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
        this.maxSize = -1;
        this.cacheEnabled = true;
        this.cacheSizeLimited = this.maxSize > 0;

        this.onError = noop;

        if (settings) {
            this.changeSettings(settings);
        }
    }

    public changeSettings(options: {
        maxSize?: number;
        cacheEnabled?: boolean;
    }): void {
        const { maxSize, cacheEnabled } = options;
        if (cacheEnabled !== undefined) {
            this.cacheEnabled = cacheEnabled;
        }
        if (maxSize !== undefined) {
            this.maxSize = maxSize;
            this.cacheSizeLimited = maxSize > 0;
        }
    }

    public setOnError(onError: (error: FrontEndError) => void): void {
        this.onError = onError;
    }

    private frameAccessError(msg?: string): CachedFrame {
        const error = new FrontEndError(
            `Error accessing frame: ${msg}`,
            ErrorLevel.WARNING
        );
        if (this.onError) {
            this.onError(error);
            throw error;
        }
        return nullCachedFrame();
    }

    public hasFrames(): boolean {
        return this.numFrames > 0 && this.head !== null && this.tail !== null;
    }

    /**
     * Walks the cache looking for node that satisfies condition
     * returns the node if found, otherwise returns null,
     * starts at head if firstNode is not provided.
     */
    private walkLinkedList(
        condition: (data: LinkedListNode) => boolean,
        firstNode?: LinkedListNode
    ): LinkedListNode | null {
        let currentNode = firstNode || this.head;
        while (currentNode) {
            if (condition(currentNode)) {
                return currentNode;
            }
            currentNode = currentNode.next;
        }
        return null;
    }

    public containsTime(time: number): boolean {
        if (time < this.getFirstFrameTime() || time > this.getLastFrameTime()) {
            return false;
        }
        return !!this.walkLinkedList((node) => node.data.time === time);
    }

    public containsFrameAtFrameNumber(frameNumber: number): boolean {
        if (
            frameNumber < this.getFirstFrameNumber() ||
            frameNumber > this.getLastFrameNumber()
        ) {
            return false;
        }
        return !!this.walkLinkedList(
            (node) => node.data.frameNumber === frameNumber
        );
    }

    public getFirstFrame(): CachedFrame {
        if (!this.head) {
            return this.frameAccessError("No data in cache.");
        }
        return this.head.data;
    }

    public getFirstFrameNumber(): number {
        return this.head?.data.frameNumber || -1;
    }

    public getFirstFrameTime(): number {
        return this.head?.data.time || -1;
    }

    public getLastFrame(): CachedFrame {
        if (!this.tail) {
            return this.frameAccessError(" No data in cache.");
        }
        return this.tail.data;
    }

    public getLastFrameNumber(): number {
        return this.tail?.data.frameNumber || -1;
    }

    public getLastFrameTime(): number {
        return this.tail?.data.time || -1;
    }

    private getFrameAtTimeOrFrameNumber(
        condition: "time" | "frameNumber",
        value: number
    ): CachedFrame {
        if (!this.head) {
            return this.frameAccessError("No data in cache.");
        }
        const frame = this.walkLinkedList(
            (node) => node.data[condition] === value
        );
        if (frame) {
            return frame.data;
        }
        return this.frameAccessError(
            `Frame not found at provided ${condition}. Attempting to access frame ${value}.`
        );
    }

    public getFrameAtTime(time: number): CachedFrame {
        return this.getFrameAtTimeOrFrameNumber("time", time);
    }

    public getFrameAtFrameNumber(frameNumber: number): CachedFrame {
        return this.getFrameAtTimeOrFrameNumber("frameNumber", frameNumber);
    }

    public assignSingleFrameToCache(data: CachedFrame): void {
        const newNode: LinkedListNode = {
            data,
            next: null,
            prev: null,
        };

        this.head = newNode;
        this.tail = newNode;
        this.size = data.size;
        this.numFrames = 1;
    }

    public addFrameToEndOfCache(data: CachedFrame): void {
        const newNode: LinkedListNode = {
            data,
            next: null,
            prev: null,
        };
        if (!this.hasFrames()) {
            this.assignSingleFrameToCache(data);
            return;
        }
        newNode.prev = this.tail;
        this.tail!.next = newNode;
        this.tail = newNode;
        this.numFrames++;
        this.size += data.size;
        if (this.cacheSizeLimited && this.size > this.maxSize) {
            this.trimCache();
        }
    }

    public addFrame(data: CachedFrame): void {
        if (this.cacheSizeLimited && this.size + data.size > this.maxSize) {
            this.trimCache(data.size);
        }
        if (this.hasFrames() && this.cacheEnabled) {
            this.addFrameToEndOfCache(data);
            return;
        }
        this.assignSingleFrameToCache(data);
    }

    // generalized to remove any node, but in theory
    // we should only be removing the head when we trim the cache
    // under current assumptions
    public removeNode(node: LinkedListNode): void {
        if (this.numFrames === 0 || !this.head || !this.tail) {
            this.frameAccessError("No data in cache.");
            return;
        }
        if (this.numFrames === 1 && this.head === this.tail) {
            this.clear();
            return;
        }
        if (node === this.head) {
            this.head = node.next;
            this.head!.prev = null;
        } else if (node === this.tail) {
            this.tail = node.prev;
            this.tail!.next = null;
        } else {
            node.prev!.next = node.next;
            node.next!.prev = node.prev;
        }
        this.numFrames--;
        this.size -= node.data.size;
    }

    public trimCache(incomingDataSize?: number): void {
        while (
            this.hasFrames() &&
            this.size + (incomingDataSize || 0) > this.maxSize
        ) {
            this.removeNode(this.head!);
        }
    }

    public clear(): void {
        this.head = null;
        this.tail = null;
        this.numFrames = 0;
        this.size = 0;
    }
}

export { VisDataCache };
