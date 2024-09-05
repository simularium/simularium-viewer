import { nullCachedFrame } from "../util";
import { TimeData } from "../viewport";

import * as util from "./ThreadUtil";
import { VisDataMessage, CachedFrame } from "./types";
import { parseVisDataMessage } from "./VisDataParse";
import { VisDataCache } from "./VisDataCache";

class VisData {
    public frameCache: VisDataCache;
    private enableCache: boolean;
    private maxCacheSize: number;
    private webWorker: Worker | null;

    private frameToWaitFor: number;
    private lockedForFrame: boolean;

    private currentFrameNumber: number;

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

    private setupWebWorker() {
        this.webWorker = new Worker(
            new URL("../visGeometry/workers/visDataWorker", import.meta.url),
            { type: "module" }
        );
        this.webWorker.onmessage = (event) => {
            this.frameCache.addFrame(event.data);
        };
    }

    public constructor() {
        this.webWorker = null;
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.setupWebWorker();
        }
        this.currentFrameNumber = -1;
        /**
         * if cache is not enabled only one current frame is ever stored
         * if cache is enabled and maxSize is -1, unlimited frames are stored
         * if cache is enabled and maxSize is set above -1, cache will be trimmed to below setting before adding frames
         * if a maxCacheSize prop has been provided, it will override this value
         */
        this.enableCache = true;
        this.maxCacheSize = -1;
        this.frameCache = new VisDataCache(this.maxCacheSize, this.enableCache);
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.timeStepSize = 0;
    }

    public get currentFrameData(): TimeData {
        if (!this.frameCache.hasFrames()) {
            return { frameNumber: 0, time: 0 };
        }

        let currentData: CachedFrame | null = null;

        if (this.currentFrameNumber < 0) {
            currentData = this.frameCache.getFirstFrame();
            if (currentData) {
                this.gotoTime(currentData.time);
            }
        } else {
            currentData = this.frameCache.getFrameAtFrameNumber(
                this.currentFrameNumber
            );
        }

        return currentData || { frameNumber: 0, time: 0 };
    }

    /**
     *   Functions to check update
     * */
    public hasLocalCacheForTime(time: number): boolean {
        if (!this.enableCache) {
            return false;
        }
        return this.frameCache.containsTime(time);
    }

    public gotoTime(time: number): void {
        const frameNumber = this.frameCache.getFrameAtTime(time)?.frameNumber;
        console.log("gotoTime frameNumber: ", frameNumber);
        if (frameNumber !== undefined) {
            this.currentFrameNumber = frameNumber;
        }
    }

    public atLatestFrame(): boolean {
        return this.currentFrameNumber >= this.frameCache.getLastFrameNumber();
    }

    public currentFrame(): CachedFrame | null {
        if (!this.frameCache.hasFrames()) {
            return nullCachedFrame();
        } else if (this.currentFrameNumber === -1) {
            this.currentFrameNumber = 0;
        }

        const frame = this.frameCache.getFrameAtFrameNumber(
            this.currentFrameNumber
        );

        if (!frame) {
            console.warn(
                `No frame data found for frame number ${this.currentFrameNumber}`
            );
            return nullCachedFrame();
        }

        return frame;
    }

    public gotoNextFrame(): void {
        if (!this.atLatestFrame()) {
            this.currentFrameNumber += 1;
        }
    }

    /**
     * Data management
     * */
    public WaitForFrame(frameNumber: number): void {
        this.frameToWaitFor = frameNumber;
        this.lockedForFrame = true;
    }

    public setMaxCacheSize(cacheLength: number | undefined): void {
        if (cacheLength === undefined || cacheLength < 0) {
            this.maxCacheSize = -1;
            return;
        }
        // cache must have at least one frame
        this.maxCacheSize = cacheLength > 0 ? cacheLength : 1;
    }

    public clearCache(): void {
        this.frameCache.clear();
        this.currentFrameNumber = -1;
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
        const parsedMsg: CachedFrame = parseVisDataMessage(visDataMsg);
        if (
            util.ThreadUtil.browserSupportsWebWorkers() &&
            this.webWorker !== null
        ) {
            this.webWorker.postMessage(parsedMsg);
        } else {
            this.frameCache.addFrame(parsedMsg);
        }
    }

    public parseAgentsFromFrameData(msg: VisDataMessage | ArrayBuffer): void {
        if (msg instanceof ArrayBuffer) {
            const frame = VisData.parseOneBinaryFrame(msg);
            if (frame.frameNumber === 0) {
                this.clearCache(); // new data has arrived
            }
            this.frameCache.addFrame(frame);
            return;
        }
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
}

export { VisData };
export default VisData;
