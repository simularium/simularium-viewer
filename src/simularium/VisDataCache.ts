import { ErrorLevel, FrontEndError } from "./FrontEndError";
import { CachedFrame, LinkedListNode } from "./types";

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

        if (settings) {
            this.changeSettings(settings);
        }
    }

    private frameAccessError(msg?: string) {
        return new FrontEndError(
            `Error accessing frame. ${msg}`,
            ErrorLevel.WARNING
        );
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

    public hasFrames(): boolean {
        return this.numFrames > 0 && this.head !== null;
    }

    public containsTime(time: number): boolean {
        let currentNode = this.head;
        if (time < this.getFirstFrameTime() || time > this.getLastFrameTime()) {
            return false;
        }
        while (currentNode) {
            if (currentNode.data.time === time) {
                return true;
            }
            currentNode = currentNode.next;
        }
        return false;
    }

    public containsFrameAtFrameNumber(frameNumber: number): boolean {
        let currentNode = this.head;
        if (currentNode?.data.frameNumber === frameNumber) {
            return true;
        }
        if (
            frameNumber < this.getFirstFrameNumber() ||
            frameNumber > this.getLastFrameNumber()
        ) {
            return false;
        }
        while (currentNode) {
            if (currentNode.data.frameNumber === frameNumber) {
                return true;
            }
            currentNode = currentNode.next;
        }
        return false;
    }

    public getFrameAtTime(time: number): CachedFrame | null {
        let currentNode = this.head;
        while (currentNode) {
            if (currentNode.data.time === time) {
                return currentNode.data;
            }
            currentNode = currentNode.next;
        }
        return null;
    }

    public getFirstFrame(): CachedFrame {
        if (!this.head) {
            throw this.frameAccessError("No data in cache.");
        }
        return this.head.data;
    }

    public getFirstFrameNumber(): number {
        return this.head?.data.frameNumber || -1;
    }

    public getFirstFrameTime(): number {
        return this.head ? this.head.data.time : -1;
    }

    public getFrameAtFrameNumber(frameNumber: number): CachedFrame {
        let currentNode = this.head;
        if (!this.head) {
            throw this.frameAccessError("No data in cache.");
        }
        while (currentNode) {
            if (currentNode.data.frameNumber !== undefined) {
                if (currentNode.data.frameNumber == frameNumber) {
                    return currentNode.data;
                }
            }
            currentNode = currentNode.next;
        }
        throw this.frameAccessError(
            `Frame not found at provided frame number. Attempting to access frame ${frameNumber}.`
        );
    }

    public getLastFrame(): CachedFrame {
        if (!this.tail) {
            throw this.frameAccessError(" No data in cache.");
        }
        return this.tail.data;
    }

    public getLastFrameNumber(): number {
        return this.tail?.data.frameNumber || -1;
    }

    public getLastFrameTime(): number {
        return this.tail?.data.time || -1;
    }

    public assignSingleFrameToCache(data: CachedFrame): void {
        const newNode: LinkedListNode = {
            data,
            next: null,
            prev: null,
        };

        newNode.next = newNode;
        newNode.prev = newNode;
        this.head = newNode;
        this.tail = newNode;
        this.size = data.size;
        this.numFrames = 1;
    }

    public addFirst(data: CachedFrame): void {
        const newNode: LinkedListNode = {
            data,
            next: null,
            prev: null,
        };
        if (this.head !== null && this.tail !== null) {
            newNode.next = this.head;
            newNode.prev = this.tail;

            this.head.prev = newNode;
            this.tail.next = newNode;
            this.head = newNode;
        }
        this.numFrames++;
        this.size += data.size;
        if (this.cacheSizeLimited && this.size > this.maxSize) {
            this.trimCache();
        }
    }

    public addLast(data: CachedFrame): void {
        const newNode: LinkedListNode = {
            data,
            next: null,
            prev: null,
        };
        if (this.tail !== null) {
            newNode.prev = this.tail;
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.numFrames++;
        this.size += data.size;
        if (this.cacheSizeLimited && this.size > this.maxSize) {
            this.trimCache();
        }
    }

    public addFrame(data: CachedFrame): void {
        if (!this.cacheEnabled || (!this.head && !this.tail)) {
            this.assignSingleFrameToCache(data);
            return;
        }
        if (this.cacheSizeLimited && this.size + data.size > this.maxSize) {
            this.trimCache(data.size);
        }
        if (this.head) {
            this.addLast(data);
        } else {
            this.addFirst(data);
        }
    }

    public remove(node: LinkedListNode): void {
        if (this.numFrames === 0 || !this.head || !this.tail) {
            throw this.frameAccessError("No data in cache.");
        }
        if (this.numFrames == 1 && node.next === node && node.prev === node) {
            // Only one node in the cache, so clear it
            this.clear();
            return;
        }

        if (node === this.head) {
            // Removing the head
            this.head = node.next;
            if (this.head !== null) {
                this.head.prev = this.tail; // Maintain circularity
            }
            if (this.tail !== null) {
                this.tail.next = this.head;
            }
        } else if (node === this.tail) {
            // Removing the tail
            this.tail = node.prev;
            if (this.tail !== null) {
                this.tail.next = this.head; // Maintain circularity
            }
            if (this.head !== null) {
                this.head.prev = this.tail;
            }
        } else {
            // Removing a middle node, adjust the surrounding nodes
            if (node.prev !== null) {
                node.prev.next = node.next;
            }
            if (node.next !== null) {
                node.next.prev = node.prev;
            }
        }
        this.numFrames--;
        this.size -= node.data.size;
    }

    public removeFirst(): void {
        if (!this.head) {
            throw this.frameAccessError("No data in cache.");
        }
        this.remove(this.head);
    }

    public trimCache(incomingDataSize?: number): void {
        while (
            this.hasFrames() &&
            this.size + (incomingDataSize || 0) > this.maxSize &&
            this.tail
        ) {
            this.removeFirst();
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
