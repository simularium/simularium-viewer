import { difference } from "lodash";

import { calculateCachedSize } from "../util";

import * as util from "./ThreadUtil";
import {
    AGENT_OBJECT_KEYS,
    AgentData,
    FrameData,
    TrajectoryFileInfo,
    EncodedTypeMapping,
    VisDataMessage,
} from "./types";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import { parseVisDataMessage } from "./VisDataParse";
import { nullAgent } from "../constants";

export interface CachedFrame {
    agentData: AgentData[];
    frameData: FrameData;
    size: number;
}

interface LinkedListNode {
    data: CachedFrame;
    next: LinkedListNode | null;
    prev: LinkedListNode | null;
}

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
            if (currentNode.data.frameData.time === time) {
                return true;
            }
            currentNode = currentNode.next;
        }
        return false;
    }

    public getFrameAtTime(time: number): CachedFrame | null {
        let currentNode = this.head;
        while (currentNode) {
            if (currentNode.data.frameData.time === time) {
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
        return this.head ? this.head.data.frameData.frameNumber : -1;
    }

    public getFirstFrameTime(): number {
        return this.head ? this.head.data.frameData.time : -1;
    }

    public getFrameAtFrameNumber(frameNumber: number): CachedFrame | null {
        let currentNode = this.head;
        while (currentNode) {
            if (currentNode.data.frameData?.frameNumber !== undefined) {
                if (currentNode.data.frameData.frameNumber == frameNumber) {
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
        if (this.tail && this.tail.data.frameData) {
            return this.tail.data.frameData.frameNumber;
        }
        return -1;
    }

    public getLastFrameTime(): number {
        return this.tail ? this.tail.data.frameData.time : -1;
    }

    public addFrame(data: CachedFrame): void {
        if (
            !this.cacheEnabled ||
            !this.head ||
            data.frameData.frameNumber === 0
        ) {
            this.clear();
            this.addFirst(data);
        } else {
            this.addLast(data);
        }
    }

    // addFirst method
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

class VisData {
    public linkedListCache: LinkedListCache;
    private enableCache: boolean;
    private maxCacheSize: number;
    private webWorker: Worker | null;

    private frameToWaitFor: number;
    private lockedForFrame: boolean;
    // private cacheFrame: number; // to do linked list would this make more sense as current frame?
    private currentCacheFrame: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private _dragAndDropFileInfo: TrajectoryFileInfo | null;

    public timeStepSize: number;

    private static parseOneBinaryFrame(data: ArrayBuffer): CachedFrame {
        const cachedFrame: CachedFrame = {
            agentData: [],
            frameData: { frameNumber: 0, time: 0 },
            size: 0,
        };
        const floatView = new Float32Array(data);
        const intView = new Uint32Array(data);
        const parsedFrameData = {
            time: floatView[1],
            frameNumber: floatView[0],
        };
        const expectedNumAgents = intView[2];

        const AGENTS_OFFSET = 3;

        const parsedAgentData: AgentData[] = [];
        let j = AGENTS_OFFSET;
        for (let i = 0; i < expectedNumAgents; i++) {
            const agentData: AgentData = nullAgent();

            for (let k = 0; k < AGENT_OBJECT_KEYS.length; ++k) {
                agentData[AGENT_OBJECT_KEYS[k]] = floatView[j++];
            }
            const nSubPoints = agentData["nSubPoints"];
            if (!Number.isInteger(nSubPoints)) {
                throw new FrontEndError(
                    "Your data is malformed, non-integer value found for num-subpoints.",
                    ErrorLevel.ERROR,
                    `Number of Subpoints: <pre>${nSubPoints}</pre>`
                );
                break;
            }
            // now read sub points.
            for (let k = 0; k < nSubPoints; k++) {
                agentData.subpoints.push(floatView[j++]);
            }
            parsedAgentData.push(agentData);
        }

        // linked list to do: don't use the extra array wrappers anymore
        const cachedSize = calculateCachedSize(parsedAgentData);
        // linked list to do: is this efficient?
        cachedFrame.agentData = parsedAgentData;
        cachedFrame.frameData = parsedFrameData;
        cachedFrame.size = cachedSize;

        return cachedFrame;
    }

    private setupWebWorker() {
        this.webWorker = new Worker(
            new URL("../visGeometry/workers/visDataWorker", import.meta.url),
            { type: "module" }
        );
        // linked list version
        // linked list to do make sure event is of type CachedData
        this.webWorker.onmessage = (event) => {
            this.linkedListCache.addFrame(event.data);
        };
    }

    public constructor() {
        this.webWorker = null;
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.setupWebWorker();
        } // linked list to do work on cache trimming
        this.currentCacheFrame = -1; // linked list to do should this be 0?
        this.enableCache = true;
        this.maxCacheSize = 10000000; // todo define defaults / constants for different browser environments
        this.linkedListCache = new LinkedListCache(
            this.maxCacheSize,
            this.enableCache
        ); // linked list to do this needs to receive the actual prop for its size or nothing (Default should be -1)
        this._dragAndDropFileInfo = null;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.timeStepSize = 0;
    }

    // linked list version
    // to do linked list this is a mess
    public get currentFrameData(): FrameData {
        let currentData: CachedFrame | null = null;
        if (
            this.linkedListCache.hasFrames() &&
            this.linkedListCache.head !== null
        ) {
            // to do linked list hasFrames() should be doing the null check
            if (this.currentCacheFrame < 0) {
                return { frameNumber: 0, time: 0 };
            } else if (
                this.currentCacheFrame >=
                this.linkedListCache.getLastFrameNumber()
            ) {
                if (this.linkedListCache.tail) {
                    currentData = this.linkedListCache.getLast();
                }
            } else {
                currentData = this.linkedListCache.getFrameAtFrameNumber(
                    this.currentCacheFrame
                );
            }
        }
        return currentData !== null
            ? currentData.frameData
            : { frameNumber: 0, time: 0 };
    }

    /**
     *   Functions to check update
     * */
    public hasLocalCacheForTime(time: number): boolean {
        if (!this.enableCache) {
            return false;
        }
        return this.linkedListCache.containsTime(time);
    }

    public gotoTime(time: number): void {
        console.log("gototime visdata");
        // this.currentCacheFrame = -1;

        const frameNumber =
            this.linkedListCache.getFrameAtTime(time)?.frameData.frameNumber;
        console.log("gotoTime frameNumber: ", frameNumber);
        if (frameNumber !== undefined) {
            this.currentCacheFrame = frameNumber;
        }
    }

    public atLatestFrame(): boolean {
        // linked list to do does this work everywhere it needs to
        // does it look like an old paradigm?
        return (
            this.currentCacheFrame >= this.linkedListCache.getLastFrameNumber()
        );
    }

    // linked list to do this whole function needs to be thought through clearly
    public currentFrame(): AgentData[] {
        if (this.linkedListCache.isEmpty()) {
            return [];
        } else if (this.currentCacheFrame === -1) {
            // linked list to do, is this right? if we are calling this we are in animate loop
            // which means trajectory is loaded, and so we should go to 0 frame and not be at -1
            // but is it the right place to do it?
            this.currentCacheFrame = 0;
        }
        return (
            this.linkedListCache.getFrameAtFrameNumber(this.currentCacheFrame)
                ?.agentData || Array<AgentData>()
        );
    }

    // linked list to do is this sufficient?
    public gotoNextFrame(): void {
        if (!this.atLatestFrame()) {
            this.currentCacheFrame += 1;
        }
    }

    /**
     * Data management
     * */
    public WaitForFrame(frameNumber: number): void {
        this.frameToWaitFor = frameNumber;
        this.lockedForFrame = true;
    }

    public setMaxCacheLength(cacheLength: number | undefined): void {
        if (cacheLength === undefined || cacheLength < 0) {
            this.maxCacheSize = -1;
            return;
        }
        // cache must have at least one frame
        this.maxCacheSize = cacheLength > 0 ? cacheLength : 1;
    }

    // linked list to do make sure we are still covering all these bases when we "clear"
    public clearCache(): void {
        this.linkedListCache.clear();
        this.currentCacheFrame = -1;
        this._dragAndDropFileInfo = null;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
    }

    public clearForNewTrajectory(): void {
        this.clearCache();
    }

    public cancelAllWorkers(): void {
        // we need to be able to terminate any queued work in the worker during trajectory changeovers
        if (
            util.ThreadUtil.browserSupportsWebWorkers() &&
            this.webWorker !== null
        ) {
            this.webWorker.terminate();
            this.setupWebWorker();
        }
    }

    public setCacheEnabled(cacheEnabled: boolean): void {
        this.enableCache = cacheEnabled;
    }

    private parseAgentsFromVisDataMessage(msg: VisDataMessage): void {
        /**
         *   visDataMsg = {
         *       ...
         *       bundleSize : Number
         *       bundleStart : Number
         *       bundleData : [
         *           {data : Number[], frameNumber : Number, time : Number},
         *           {...}, {...}, ...
         *       ]
         *   }
         */

        const visDataMsg = msg as VisDataMessage;
        if (this.lockedForFrame === true) {
            if (visDataMsg.bundleData[0].frameNumber !== this.frameToWaitFor) {
                // This object is waiting for a frame with a specified frame number
                //  and  the arriving frame didn't match it
                return;
            } else {
                this.lockedForFrame = false;
                this.frameToWaitFor = 0;
            }
        }

        if (
            util.ThreadUtil.browserSupportsWebWorkers() &&
            this.webWorker !== null
        ) {
            this.webWorker.postMessage(visDataMsg);
        } else {
            // to do linked list can this be more than one frame?
            const frame = parseVisDataMessage(visDataMsg);
            this.linkedListCache.addFrame(frame);
        }
    }

    public parseAgentsFromFrameData(msg: VisDataMessage | ArrayBuffer): void {
        if (msg instanceof ArrayBuffer) {
            const frame = VisData.parseOneBinaryFrame(msg);
            if (
                // linked list to do
                // this isn't actually the same check as before, its asking if there is agent dat awhich we maybe shuoldnt do
                frame.agentData.length > 0 &&
                // this is asking if the first frame in the new data is frame 0
                frame.frameData.frameNumber === 0
            ) {
                this.clearCache(); // new data has arrived
            }
            this.linkedListCache.addFrame(frame);
            return;
        }

        // linked list to do: handle VisDataMessage properly
        this.parseAgentsFromVisDataMessage(msg);
    }

    public parseAgentsFromNetData(msg: VisDataMessage | ArrayBuffer): void {
        if (msg instanceof ArrayBuffer) {
            // Streamed binary file data messages contain message type, file name
            // length, and file name in header, which local file data messages
            // do not. Once those parts are stripped out, processing is the same
            const floatView = new Float32Array(msg);

            const fileNameSize = Math.ceil(floatView[1] / 4);
            const dataStart = (2 + fileNameSize) * 4;

            msg = msg.slice(dataStart);
        }

        this.parseAgentsFromFrameData(msg);
    }

    // // for use w/ a drag-and-drop trajectory file
    // //  save a file for playback
    // // will be caught by controller.changeFile(...).catch()
    // linked list to do confirm this is still used and working
    public cacheJSON(visDataMsg: VisDataMessage): void {
        if (!this.linkedListCache.isEmpty()) {
            throw new Error(
                "cache not cleared before cacheing a new drag-and-drop file"
            );
        }
        // linked list to do can this be more than one frame?
        const frame = parseVisDataMessage(visDataMsg);
        this.linkedListCache.addFrame(frame);
    }

    public set dragAndDropFileInfo(fileInfo: TrajectoryFileInfo | null) {
        if (!fileInfo) return;
        // NOTE: this may be a temporary check as we're troubleshooting new file formats
        const missingIds = this.checkTypeMapping(fileInfo.typeMapping);

        if (missingIds.length) {
            const include = confirm(
                `Your file typeMapping is missing names for the following type ids: ${missingIds}. Do you want to include them in the interactive interface?`
            );
            if (include) {
                missingIds.forEach((id) => {
                    fileInfo.typeMapping[id] = { name: id.toString() };
                });
            }
        }
        this._dragAndDropFileInfo = fileInfo;
    }

    public get dragAndDropFileInfo(): TrajectoryFileInfo | null {
        if (!this._dragAndDropFileInfo) {
            return null;
        }
        return this._dragAndDropFileInfo;
    }

    // will be caught by controller.changeFile(...).catch()
    // linked list to do TODO: check if this code is still used
    public checkTypeMapping(typeMappingFromFile: EncodedTypeMapping): number[] {
        if (!typeMappingFromFile) {
            throw new Error(
                "data needs 'typeMapping' object to display agent controls"
            );
        }
        const idsInFrameData = new Set();
        const idsInTypeMapping = Object.keys(typeMappingFromFile).map(Number);

        if (this.linkedListCache.isEmpty()) {
            console.log("no data to check type mapping against");
            return [];
        }

        // this is calling the (element) func on each agentdata[]
        // so i need to call currentNode.data.agentData.map... on each node
        this.linkedListCache.walkList((node) => {
            node.data.agentData.map((agent) => idsInFrameData.add(agent.type));
        });
        const idsArr: number[] = [...idsInFrameData].sort() as number[];
        return difference(idsArr, idsInTypeMapping).sort();
    }
}

export { VisData };
export default VisData;
