import { noop } from "lodash";

import { nullCachedFrame } from "../util.js";

import { VisDataMessage, CachedFrame } from "./types.js";
import { parseVisDataMessage } from "./VisDataParse.js";
import { VisDataCache } from "./VisDataCache.js";
import { ErrorLevel, FrontEndError } from "./FrontEndError.js";
import { BYTE_SIZE_64_BIT_NUM } from "../constants.js";

class VisData {
    public frameCache: VisDataCache;

    private frameToWaitFor: number;
    private lockedForFrame: boolean;

    private currentFrameNumber: number;

    public timeStepSize: number;
    public onError: (error: FrontEndError) => void;

    private static parseOneBinaryFrame(data: ArrayBuffer): CachedFrame {
        const floatView = new Float32Array(data);
        const intView = new Uint32Array(data);
        const frameData: CachedFrame = {
            data: data,
            frameNumber: floatView[0],
            time: floatView[1],
            agentCount: intView[2],
            size: 0,
        };
        const numMetadataFields = Object.keys(frameData).length - 1; // exclude "data" field
        frameData.size =
            data.byteLength + numMetadataFields * BYTE_SIZE_64_BIT_NUM;

        return frameData;
    }

    public constructor() {
        this.currentFrameNumber = -1;
        this.frameCache = new VisDataCache();
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.timeStepSize = 0;

        this.onError = noop;
    }

    public setOnError(onError: (error: FrontEndError) => void): void {
        this.onError = onError;
    }

    public get currentFrameData(): CachedFrame {
        if (!this.frameCache.hasFrames()) {
            return nullCachedFrame();
        }
        if (this.currentFrameNumber < 0) {
            const firstFrame = this.frameCache.getFirstFrame();
            if (firstFrame) {
                this.currentFrameNumber = firstFrame.frameNumber;
                return firstFrame;
            }
        } else {
            const frame = this.frameCache.getFrameAtFrameNumber(
                this.currentFrameNumber
            );
            if (frame !== undefined) {
                return frame;
            }
        }
        return nullCachedFrame();
    }

    /**
     *   Functions to check update
     * */
    public hasLocalCacheForTime(time: number): boolean {
        return this.frameCache.containsTime(time);
    }

    public gotoTime(time: number): void {
        const frameNumber = this.frameCache.getFrameAtTime(time)?.frameNumber;
        if (frameNumber !== undefined) {
            this.currentFrameNumber = frameNumber;
        }
    }

    public atLatestFrame(): boolean {
        return this.currentFrameNumber >= this.frameCache.getLastFrameNumber();
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

    public clearCache(): void {
        this.frameCache.clear();
        this.currentFrameNumber = -1;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
    }

    public clearForNewTrajectory(): void {
        this.clearCache();
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
            this.frameCache.cacheSizeLimited &&
            parsedMsg.size > this.frameCache.maxSize
        ) {
            this.frameExceedsCacheSizeError(parsedMsg.size);
            return;
        }
        this.addFrameToCache(parsedMsg);
    }

    public parseAgentsFromFrameData(msg: VisDataMessage | ArrayBuffer): void {
        if (msg instanceof ArrayBuffer) {
            const frame = VisData.parseOneBinaryFrame(msg);
            if (frame.frameNumber === 0) {
                this.clearCache(); // new data has arrived
            }
            this.addFrameToCache(frame);
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

    private addFrameToCache(frame: CachedFrame): void {
        if (
            this.frameCache.cacheSizeLimited &&
            frame.size > this.frameCache.maxSize
        ) {
            this.frameExceedsCacheSizeError(frame.size);
            return;
        }
        this.frameCache.addFrame(frame);
    }

    private frameExceedsCacheSizeError(frameSize: number): void {
        this.onError(
            new FrontEndError(
                `Frame size exceeds cache size: ${frameSize} > ${this.frameCache.maxSize}`,
                ErrorLevel.ERROR
            )
        );
    }
}

export { VisData };
export default VisData;
