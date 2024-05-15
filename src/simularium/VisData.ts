import { difference } from "lodash";

import { compareTimes } from "../util";

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
import type { ParsedBundle } from "./VisDataParse";
import { parseVisDataMessage } from "./VisDataParse";

// must be utf-8 encoded
const EOF_PHRASE: Uint8Array = new TextEncoder().encode(
    "\\EOFTHEFRAMEENDSHERE"
);

class VisData {
    private frameCache: AgentData[][];
    private frameDataCache: FrameData[];
    private maxCacheLength: number;
    private webWorker: Worker | null;

    private frameToWaitFor: number;
    private lockedForFrame: boolean;
    private cacheFrame: number;
    private netBuffer: ArrayBuffer;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private _dragAndDropFileInfo: TrajectoryFileInfo | null;

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
            const agentData: AgentData = {
                //TODO use visType in AgentData and convert from "vis-type" here at parse time
                "vis-type": -1,
                instanceId: -1,
                type: -1,
                x: 0,
                y: 0,
                z: 0,
                xrot: 0,
                yrot: 0,
                zrot: 0,
                cr: 0,
                subpoints: [],
            };

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

    public static parseBinary(data: ArrayBuffer): ParsedBundle {
        const parsedAgentDataArray: AgentData[][] = [];
        const frameDataArray: FrameData[] = [];

        const byteView = new Uint8Array(data);
        const length = byteView.length;
        const lastEOF = length - EOF_PHRASE.length;
        let end = 0;
        let start = 0;

        const frameDataView = new Float32Array(data);

        while (end < lastEOF) {
            // Find the next End of Frame signal
            for (; end < length; end = end + 4) {
                const curr = byteView.subarray(end, end + EOF_PHRASE.length);
                if (curr.every((val, i) => val === EOF_PHRASE[i])) {
                    break;
                }
            }

            // contains Frame # | Time Stamp | # of Agents
            const frameInfoView = frameDataView.subarray(
                start / 4,
                (start + 12) / 4
            );

            // contains parsable agents
            const agentDataView = frameDataView.subarray(
                (start + 12) / 4,
                end / 4
            );

            const parsedFrameData = {
                time: frameInfoView[1],
                frameNumber: frameInfoView[0],
            };
            const expectedNumAgents = frameInfoView[2];
            frameDataArray.push(parsedFrameData);

            // Parse the frameData
            const parsedAgentData: AgentData[] = [];
            const nSubPointsIndex = AGENT_OBJECT_KEYS.findIndex(
                (ele) => ele === "nSubPoints"
            );

            const parseOneAgent = (agentArray): AgentData => {
                return agentArray.reduce(
                    (agentData, cur, i) => {
                        let key;
                        if (AGENT_OBJECT_KEYS[i]) {
                            key = AGENT_OBJECT_KEYS[i];
                            agentData[key] = cur;
                        } else if (
                            i <
                            agentArray.length + agentData.nSubPoints
                        ) {
                            agentData.subpoints.push(cur);
                        }
                        return agentData;
                    },
                    { subpoints: [] }
                );
            };

            let dataIter = 0;
            while (dataIter < agentDataView.length) {
                const nSubPoints = agentDataView[dataIter + nSubPointsIndex];
                if (
                    !Number.isInteger(nSubPoints) ||
                    !Number.isInteger(dataIter)
                ) {
                    throw new FrontEndError(
                        "Your data is malformed, non-integer value found for num-subpoints.",
                        ErrorLevel.ERROR,
                        `Number of Subpoints: <pre>${nSubPoints}</pre>`
                    );
                    break;
                }

                // each array length is variable based on how many subpoints the agent has
                const chunkLength = AGENT_OBJECT_KEYS.length + nSubPoints;
                const remaining = agentDataView.length - dataIter;
                if (remaining < chunkLength - 1) {
                    const attemptedMapping = AGENT_OBJECT_KEYS.map(
                        (name, index) =>
                            `${name}: ${agentDataView[dataIter + index]}<br />`
                    );
                    // will be caught by controller.changeFile(...).catch()
                    throw new FrontEndError(
                        "Your data is malformed, non-integer value found for num-subpoints.",
                        ErrorLevel.ERROR,
                        `Example attempt to parse your data: <pre>${attemptedMapping.join(
                            ""
                        )}</pre>`
                    );
                }

                const agentSubSetArray = agentDataView.subarray(
                    dataIter,
                    dataIter + chunkLength
                );
                if (agentSubSetArray.length < AGENT_OBJECT_KEYS.length) {
                    const attemptedMapping = AGENT_OBJECT_KEYS.map(
                        (name, index) =>
                            `${name}: ${agentSubSetArray[index]}<br />`
                    );
                    // will be caught by controller.changeFile(...).catch()
                    throw new FrontEndError(
                        "Your data is malformed, there are less entries than expected for this agent.",
                        ErrorLevel.ERROR,
                        `Example attempt to parse your data: <pre>${attemptedMapping.join(
                            ""
                        )}</pre>`
                    );
                }

                const agent = parseOneAgent(agentSubSetArray);
                parsedAgentData.push(agent);
                dataIter = dataIter + chunkLength;
            }

            const numParsedAgents = parsedAgentData.length;
            if (numParsedAgents != expectedNumAgents) {
                throw new FrontEndError(
                    "Mismatch between expected num agents and parsed num agents, possible offset error"
                );
            }

            parsedAgentDataArray.push(parsedAgentData);

            start = end + EOF_PHRASE.length;
            end = start;
        }

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
        this.maxCacheLength = -1;
        this._dragAndDropFileInfo = null;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.netBuffer = new ArrayBuffer(0);
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

    public setMaxCacheLength(cacheLength: number | undefined): void {
        if (cacheLength === undefined || cacheLength < 0) {
            this.maxCacheLength = -1;
            return;
        }
        // cache must have at least one frame
        this.maxCacheLength = cacheLength > 0 ? cacheLength : 1;
    }

    public clearCache(): void {
        this.frameCache = [];
        this.frameDataCache = [];
        this.cacheFrame = -1;
        this._dragAndDropFileInfo = null;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.netBuffer = new ArrayBuffer(0);
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

    // Add parsed frames to the cache and save the timestamp of the first frame
    private addFramesToCache(frames: ParsedBundle): void {
        Array.prototype.push.apply(this.frameDataCache, frames.frameDataArray);
        Array.prototype.push.apply(
            this.frameCache,
            frames.parsedAgentDataArray
        );
        if (
            this.maxCacheLength > 0 &&
            this.frameDataCache.length > this.maxCacheLength
        ) {
            this.trimCacheHead(
                this.frameDataCache.length - this.maxCacheLength
            );
        }
    }

    private trimCacheHead(nFrames: number): void {
        this.frameCache.splice(0, nFrames);
        this.frameDataCache.splice(0, nFrames);
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

    public parseAgentsFromLocalFileData(
        msg: VisDataMessage | ArrayBuffer
    ): void {
        if (msg instanceof ArrayBuffer) {
            // Streamed binary data can have partial frames but
            // drag and drop is assumed to provide whole frames.
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
            const floatView = new Float32Array(msg);

            const fileNameSize = Math.ceil(floatView[1] / 4);
            const dataStart = (2 + fileNameSize) * 4;

            this.parseBinaryNetData(msg as ArrayBuffer, dataStart);
            return;
        }

        this.parseAgentsFromVisDataMessage(msg);
    }

    private parseBinaryNetData(data: ArrayBuffer, dataStart: number) {
        let eof = -1;

        // find last '/eof' signal in new data
        const byteView = new Uint8Array(data);

        // walk backwards in order to find the last eofPhrase in the data
        let index = byteView.length - EOF_PHRASE.length;
        for (; index > 0; index = index - 4) {
            const curr = byteView.subarray(index, index + EOF_PHRASE.length);
            if (curr.every((val, i) => val === EOF_PHRASE[i])) {
                eof = index;
                break;
            }
        }

        if (eof > dataStart) {
            const frame = data.slice(dataStart, eof);

            const tmp = new ArrayBuffer(
                this.netBuffer.byteLength + frame.byteLength
            );
            new Uint8Array(tmp).set(new Uint8Array(this.netBuffer));
            new Uint8Array(tmp).set(
                new Uint8Array(frame),
                this.netBuffer.byteLength
            );

            try {
                const frames = VisData.parseBinary(tmp);
                if (
                    frames.frameDataArray.length > 0 &&
                    frames.frameDataArray[0].frameNumber === 0
                ) {
                    this.clearCache(); // new data has arrived
                }
                this.addFramesToCache(frames);
            } catch (err) {
                // TODO: There are frequent errors due to a race condition that
                // occurs when jumping to a new time if a partial frame is received
                // after netBuffer is cleared. We don't want this to trigger a front
                // end error, it's best to catch it here and just move on, as the
                // issue should be contained to just one frame. When binary messages
                // are updated to include frame num for partial frames in their header,
                // we can ensure that netBuffer is being combined with the matching
                // frame, and this try/catch can be removed
                console.log(err);
            }

            // Save remaining data for later processing
            const remainder = data.slice(eof + EOF_PHRASE.length);
            this.netBuffer = new ArrayBuffer(remainder.byteLength);
            new Uint8Array(this.netBuffer).set(new Uint8Array(remainder));
        } else {
            // Append the new data, and wait until eof
            const frame = data.slice(dataStart, data.byteLength);
            const tmp = new ArrayBuffer(
                this.netBuffer.byteLength + frame.byteLength
            );
            new Uint8Array(tmp).set(new Uint8Array(this.netBuffer));
            new Uint8Array(tmp).set(
                new Uint8Array(frame),
                this.netBuffer.byteLength
            );

            this.netBuffer = tmp;
        }
    }

    // for use w/ a drag-and-drop trajectory file
    //  save a file for playback
    // will be caught by controller.changeFile(...).catch()
    public cacheJSON(visDataMsg: VisDataMessage): void {
        if (this.frameCache.length > 0) {
            throw new Error(
                "cache not cleared before cacheing a new drag-and-drop file"
            );
        }

        const frames = parseVisDataMessage(visDataMsg);
        this.addFramesToCache(frames);
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
    // TODO: check if this code is still used
    public checkTypeMapping(typeMappingFromFile: EncodedTypeMapping): number[] {
        if (!typeMappingFromFile) {
            throw new Error(
                "data needs 'typeMapping' object to display agent controls"
            );
        }
        const idsInFrameData = new Set();
        const idsInTypeMapping = Object.keys(typeMappingFromFile).map(Number);

        if (this.frameCache.length === 0) {
            console.log("no data to check type mapping against");
            return [];
        }

        this.frameCache.forEach((element) => {
            element.map((agent) => idsInFrameData.add(agent.type));
        });
        const idsArr: number[] = [...idsInFrameData].sort() as number[];
        return difference(idsArr, idsInTypeMapping).sort();
    }
}

export { VisData };
export default VisData;
