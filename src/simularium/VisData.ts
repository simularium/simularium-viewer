import { compareTimes } from "../util";

import * as util from "./ThreadUtil";
import {
    AGENT_OBJECT_KEYS,
    AgentData,
    FrameData,
    VisDataMessage,
} from "./types";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import type { ParsedBundle } from "./VisDataParse";
import { parseVisDataMessage } from "./VisDataParse";
import { nullAgent } from "../constants";

class VisData {
    private frameCache: AgentData[][];
    private frameDataCache: FrameData[];
    private enableCache: boolean;
    private webWorker: Worker | null;

    private frameToWaitFor: number;
    private lockedForFrame: boolean;
    private cacheFrame: number;

    public timeStepSize: number;

    private static parseOneBinaryFrame(data: ArrayBuffer): ParsedBundle {
        const parsedAgentDataArray: AgentData[][] = [];
        const frameDataArray: FrameData[] = [];
        const floatView = new Float32Array(data);
        const intView = new Uint32Array(data);
        const parsedFrameData = {
            time: floatView[1],
            frameNumber: floatView[0],
        };
        const expectedNumAgents = intView[2];
        frameDataArray.push(parsedFrameData);

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
        parsedAgentDataArray.push(parsedAgentData);

        return {
            parsedAgentDataArray,
            frameDataArray,
        };
    }

    private setupWebWorker() {
        this.webWorker = new Worker(
            new URL("../visGeometry/workers/visDataWorker", import.meta.url),
            { type: "module" }
        );

        // event.data is of type ParsedBundle
        this.webWorker.onmessage = (event) => {
            if (!this.enableCache) {
                this.frameDataCache = [...event.data.frameDataArray];
                this.frameCache = [...event.data.parsedAgentDataArray];
                return;
            }
            Array.prototype.push.apply(
                this.frameDataCache,
                event.data.frameDataArray
            );
            Array.prototype.push.apply(
                this.frameCache,
                event.data.parsedAgentDataArray
            );
        };
    }

    public constructor() {
        this.webWorker = null;
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.setupWebWorker();
        }
        this.frameCache = [];
        this.frameDataCache = [];
        this.cacheFrame = -1;
        this.enableCache = true;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.timeStepSize = 0;
    }

    //get time() { return this.cacheFrame < this.frameDataCache.length ? this.frameDataCache[this.cacheFrame] : -1 }
    public get currentFrameData(): FrameData {
        if (this.frameDataCache.length > 0) {
            if (this.cacheFrame < 0) {
                return this.frameDataCache[0];
            } else if (this.cacheFrame >= this.frameDataCache.length) {
                return this.frameDataCache[this.frameDataCache.length - 1];
            } else {
                return this.frameDataCache[this.cacheFrame];
            }
        }

        return { frameNumber: 0, time: 0 };
    }

    /**
     *   Functions to check update
     * */
    public hasLocalCacheForTime(time: number): boolean {
        // TODO: debug compareTimes
        if (!this.enableCache) {
            return false;
        }
        if (this.frameDataCache.length < 1) {
            return false;
        }

        const firstFrameTime = this.frameDataCache[0].time;
        const lastFrameTime =
            this.frameDataCache[this.frameDataCache.length - 1].time;

        const notLessThanFirstFrameTime =
            compareTimes(time, firstFrameTime, this.timeStepSize) !== -1;
        const notGreaterThanLastFrameTime =
            compareTimes(time, lastFrameTime, this.timeStepSize) !== 1;
        return notLessThanFirstFrameTime && notGreaterThanLastFrameTime;
    }

    public gotoTime(time: number): void {
        this.cacheFrame = -1;

        // Find the index of the frame that has the time matching our target time
        const frameNumber = this.frameDataCache.findIndex((frameData) => {
            return compareTimes(frameData.time, time, this.timeStepSize) === 0;
        });

        // frameNumber is -1 if findIndex() above doesn't find a match
        if (frameNumber !== -1) {
            this.cacheFrame = frameNumber;
        }
    }

    public atLatestFrame(): boolean {
        if (this.cacheFrame === -1 && this.frameCache.length > 0) {
            return false;
        }

        return this.cacheFrame >= this.frameCache.length - 1;
    }

    public currentFrame(): AgentData[] {
        if (this.frameCache.length === 0) {
            return [];
        } else if (this.cacheFrame === -1) {
            this.cacheFrame = 0;
            return this.frameCache[0];
        }

        return this.cacheFrame < this.frameCache.length
            ? this.frameCache[this.cacheFrame]
            : Array<AgentData>();
    }

    public gotoNextFrame(): void {
        if (!this.atLatestFrame()) {
            this.cacheFrame = this.cacheFrame + 1;
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
        this.frameCache = [];
        this.frameDataCache = [];
        this.cacheFrame = -1;
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

    // Add parsed frames to the cache and save the timestamp of the first frame
    private addFramesToCache(frames: ParsedBundle): void {
        if (!this.enableCache) {
            this.frameDataCache = [...frames.frameDataArray];
            this.frameCache = [...frames.parsedAgentDataArray];
            return;
        }
        Array.prototype.push.apply(this.frameDataCache, frames.frameDataArray);
        Array.prototype.push.apply(
            this.frameCache,
            frames.parsedAgentDataArray
        );
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
            const frames = parseVisDataMessage(visDataMsg);
            this.addFramesToCache(frames);
        }
    }

    public parseAgentsFromFrameData(msg: VisDataMessage | ArrayBuffer): void {
        if (msg instanceof ArrayBuffer) {
            const frames = VisData.parseOneBinaryFrame(msg);
            if (
                frames.frameDataArray.length > 0 &&
                frames.frameDataArray[0].frameNumber === 0
            ) {
                this.clearCache(); // new data has arrived
            }
            this.addFramesToCache(frames);
            return;
        }

        // handle VisDataMessage
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
