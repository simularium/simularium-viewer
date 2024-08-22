import { CachedFrame, LinkedListNode } from "./types";

// todo go over naming and whether it should be in this file...
// review all methods for their necessity and their efficiency
class LinkedListCache {
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

    public walkList(cb: (arg: any) => void): void {
        let currentNode = this.head;
        while (currentNode) {
            cb(currentNode);
            currentNode = currentNode.next;
        }
    }

    public isEmpty(): boolean {
        return this.numFrames === 0 && this.head === null && this.tail === null;
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
    // get method (by frame number)
    // getFirst method
    public getFirst(): CachedFrame | null {
        return this.head ? this.head.data : null;
    }

    public getFirstFrameNumber(): number {
        return this.head ? this.head.data.frameNumber : -1;
    }

    public getFirstFrameTime(): number {
        return this.head ? this.head.data.time : -1;
    }

    public getFrameAtFrameNumber(frameNumber: number): CachedFrame | null {
        let currentNode = this.head;
        while (currentNode) {
            if (currentNode.data.frameNumber !== undefined) {
                if (currentNode.data.frameNumber == frameNumber) {
                    return currentNode.data;
                }
            }
            currentNode = currentNode.next;
        }
        return null;
    }

    // getLast method
    public getLast(): CachedFrame | null {
        return this.tail ? this.tail.data : null;
    }

    // linked list to do check if this is working well
    public getLastFrameNumber(): number {
        if (this.tail && this.tail.data) {
            return this.tail.data.frameNumber;
        }
        return -1;
    }

    public getLastFrameTime(): number {
        return this.tail ? this.tail.data.time : -1;
    }

    public addFrame(data: CachedFrame): void {
        if (!this.cacheEnabled || !this.head || data.frameNumber === 0) {
            this.clear();
            this.addFirst(data);
        } else {
            this.addLast(data);
        }
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
        // linked list to do: trim cache if necessary
        this.size += data.size;
        if (this.cacheSizeLimited && this.size > this.maxSize) {
            this.trimCache();
        }
    }
    // addLast method
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
        // linked list to do: trim cache if necessary
        this.size += data.size;
        if (this.cacheSizeLimited && this.size > this.maxSize) {
            this.trimCache();
        }
    }
    // remove method
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
    // removeFirst method
    public removeFirst(): CachedFrame | null {
        if (!this.head) {
            return null;
        }
        const data = this.head.data;
        this.remove(this.head);
        return data;
    }
    // removeLast method
    public removeLast(): CachedFrame | null {
        if (!this.tail) {
            return null;
        }
        const data = this.tail.data;
        this.remove(this.tail);
        return data;
    }

    // Helper method to trim the cache if it exceeds the max size
    private trimCache(): void {
        console.log("trimming cache");
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

    // Method to replace existing cache contents with a single CachedData element
    public replaceWithSingle(data: CachedFrame): void {
        // Clear the cache
        this.head = null;
        this.tail = null;
        this.numFrames = 0;
        this.size = 0;

        // Add the new data as the only element in the cache
        this.addFirst(data);
    }
}

export { LinkedListCache };
export default LinkedListCache;
