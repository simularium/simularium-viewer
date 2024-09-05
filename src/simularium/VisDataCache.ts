import { ErrorLevel, FrontEndError } from "./FrontEndError";
import { CachedFrame, LinkedListNode } from "./types";
class VisDataCache {
    public head: LinkedListNode | null;
    public tail: LinkedListNode | null;
    public numFrames: number;
    public size: number;
    public maxSize: number;
    public cacheEnabled: boolean;
    public cacheSizeLimited: boolean;

    public constructor(maxSize = -1, cacheEnabled = true) {
        this.head = null;
        this.tail = null;
        this.numFrames = 0;
        this.size = 0;
        this.maxSize = maxSize;
        this.cacheEnabled = cacheEnabled;
        this.cacheSizeLimited = maxSize > 0;
    }

    private frameAccessError(msg?: string) {
        return new FrontEndError(
            `Error accessing frame. ${msg}`,
            ErrorLevel.WARNING
        );
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
            "Frame not found at provided frame number."
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

    public addFirst(data: CachedFrame): void {
        const newNode: LinkedListNode = {
            data,
            next: this.head,
            prev: null,
        };
        if (this.head) {
            this.head.prev = newNode;
        }
        this.head = newNode;
        if (!this.tail) {
            this.tail = newNode;
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
            prev: this.tail,
        };
        if (this.tail) {
            this.tail.next = newNode;
        }
        this.tail = newNode;
        if (!this.head) {
            this.head = newNode;
        }
        this.numFrames++;

        this.size += data.size;
        if (this.cacheSizeLimited && this.size > this.maxSize) {
            this.trimCache();
        }
    }

    public addFrame(data: CachedFrame): void {
        if (!this.cacheEnabled || !this.head || data.frameNumber === 0) {
            this.clear();
            this.addFirst(data);
        } else {
            this.addLast(data);
        }
    }

    public remove(node: LinkedListNode): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
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

    public trimCache(): void {
        while (this.size > this.maxSize && this.tail) {
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
