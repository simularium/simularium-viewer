import { difference } from "lodash";

import { nullCachedFrame } from "../util";
import { TimeData } from "../viewport";

import * as util from "./ThreadUtil";
import {
    TrajectoryFileInfo,
    EncodedTypeMapping,
    VisDataMessage,
    CachedFrame,
} from "./types";
import { parseVisDataMessage } from "./VisDataParse";
import { LinkedListCache } from "./VisDataCache";

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
        const floatView = new Float32Array(data);
        const intView = new Uint32Array(data);

        const frameData: CachedFrame = {
            data: data,
            frameNumber: floatView[0],
            time: floatView[1],
            agentCount: intView[2],
            size: data.byteLength + 8 * 4,
        };

        return frameData;
    }

    // to do are we getting the size correctly above? is it that simple?
    // private static calculateFrameSize(data: ArrayBuffer): number {
    //     const floatView = new Float32Array(data);
    //     const agentCount = floatView[2];
    //     let totalSize = this.HEADER_SIZE * 4; // Header size in bytes

    //     let offset = this.HEADER_SIZE;
    //     for (let i = 0; i < agentCount; i++) {
    //         offset += this.AGENT_HEADER_SIZE;
    //         const nSubPoints = floatView[offset - 1];
    //         offset += nSubPoints;
    //         totalSize += (this.AGENT_HEADER_SIZE + nSubPoints) * 4; // Size in bytes
    //     }

    //     return totalSize;
    // }

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
        }
        this.currentCacheFrame = -1;
        this.enableCache = true;
        // this.maxCacheSize = 10000000; // todo define defaults / constants for different browser environments
        this.maxCacheSize = -1;
        this.linkedListCache = new LinkedListCache(
            this.maxCacheSize,
            this.enableCache
        );
        this._dragAndDropFileInfo = null;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.timeStepSize = 0;
    }

    // linked list version
    // to do linked list this is a mess
    // to do for CachedFrame seems its always returning the time so going enforce that for now
    public get currentFrameData(): TimeData {
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
            ? { frameNumber: currentData.frameNumber, time: currentData.time }
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
            this.linkedListCache.getFrameAtTime(time)?.frameNumber;
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
    public currentFrame(): CachedFrame | null {
        if (this.linkedListCache.isEmpty()) {
            // return null;
            return nullCachedFrame();
        } else if (this.currentCacheFrame === -1) {
            // If we're calling this, we are likely in the animate loop,
            // which means the trajectory is loaded, so we should go to frame 0.
            this.currentCacheFrame = 0;
        }

        const frame = this.linkedListCache.getFrameAtFrameNumber(
            this.currentCacheFrame
        );

        if (!frame) {
            console.warn(
                `No frame data found for frame number ${this.currentCacheFrame}`
            );
            return nullCachedFrame();
        }

        return frame;
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
                // frame.agentData.length > 0 &&
                // this is asking if the first frame in the new data is frame 0
                frame.frameNumber === 0
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
