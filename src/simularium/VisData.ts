import { difference } from "lodash";
import * as util from "./ThreadUtil";
import {
    TrajectoryFileInfo,
    EncodedTypeMapping,
    VisDataMessage,
} from "./types";
import FrontEndError from "./FrontEndError";

/**
 * Parse Agents from Net Data
 * */
export interface AgentData {
    x: number;
    y: number;
    z: number;
    xrot: number;
    yrot: number;
    zrot: number;
    instanceId: number;
    visType: number;
    type: number;
    cr: number;
    subpoints: number[];
}

interface FrameData {
    frameNumber: number;
    time: number;
}

interface ParsedBundle {
    frameDataArray: FrameData[];
    parsedAgentDataArray: AgentData[][];
}

class VisData {
    private frameCache: AgentData[][];
    private frameDataCache: FrameData[];
    private webWorker: Worker | null;

    private frameToWaitFor: number;
    private lockedForFrame: boolean;
    private cacheFrame: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private _dragAndDropFileInfo: TrajectoryFileInfo | null;
    /**
     *   Parses a stream of data sent from the backend
     *
     *   To minimize bandwidth, traits/objects are not packed
     *   1-1; what arrives is an array of float values
     *
     *   For instance for:
     *   entity = (
     *        trait1 : 4,
     *        trait2 : 5,
     *        trait3 : 6,
     *    ) ...
     *
     *   what arrives will be:
     *       [...,4,5,6,...]
     *
     *   The traits are assumed to be variable in length,
     *   and the alorithm to decode them needs to the reverse
     *   of the algorithm that packed them on the backend
     *
     *   This is more convuluted than sending the JSON objects themselves,
     *   however these frames arrive multiple times per second. Even a naive
     *   packing reduces the packet size by ~50%, reducing how much needs to
     *   paid for network bandwith (and improving the quality & responsiveness
     *   of the application, since network latency is a major bottle-neck)
     * */

    public static parse(visDataMsg: VisDataMessage): ParsedBundle {
        const parsedAgentDataArray: AgentData[][] = [];
        const frameDataArray: FrameData[] = [];
        visDataMsg.bundleData.forEach((frame) => {
            // IMPORTANT: Order of this array needs to perfectly match the incoming data.
            const agentObjectKeys = [
                "vis-type",
                "instanceId",
                "type",
                "x",
                "y",
                "z",
                "xrot",
                "yrot",
                "zrot",
                "cr",
                "nSubPoints",
            ];
            const visData = frame.data;
            const parsedAgentData: AgentData[] = [];
            const nSubPointsIndex = agentObjectKeys.findIndex(
                (ele) => ele === "nSubPoints"
            );

            const parseOneAgent = (agentArray): AgentData => {
                return agentArray.reduce(
                    (agentData, cur, i) => {
                        let key;
                        if (agentObjectKeys[i]) {
                            key = agentObjectKeys[i];
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

            while (visData.length) {
                const nSubPoints = visData[nSubPointsIndex];
                const chunkLength = agentObjectKeys.length + nSubPoints; // each array length is variable based on how many subpoints the agent has
                if (visData.length < chunkLength) {
                    const attemptedMapping = agentObjectKeys.map(
                        (name, index) => `${name}: ${visData[index]}<br />`
                    );
                    // passed up in controller.handleLocalFileChange
                    throw new FrontEndError(
                        `Example attempt to parse your data: <pre>${attemptedMapping.join(
                            ""
                        )}</pre>`,
                        "your data is malformed, there are too few entries."
                    );
                }

                const agentSubSetArray = visData.splice(0, chunkLength); // cut off the array of 1 agent data from front of the array;
                if (agentSubSetArray.length < agentObjectKeys.length) {
                    const attemptedMapping = agentObjectKeys.map(
                        (name, index) =>
                            `${name}: ${agentSubSetArray[index]}<br />`
                    );
                    // passed up in controller.handleLocalFileChange
                    throw new FrontEndError(
                        `Example attempt to parse your data: <pre>${attemptedMapping.join(
                            ""
                        )}</pre>`,
                        "your data is malformed, there are less entries than expected for this agent"
                    );
                }

                const agent = parseOneAgent(agentSubSetArray);
                parsedAgentData.push(agent);
            }

            const frameData: FrameData = {
                time: frame.time,
                frameNumber: frame.frameNumber,
            };

            parsedAgentDataArray.push(parsedAgentData);
            frameDataArray.push(frameData);
        });

        return {
            parsedAgentDataArray,
            frameDataArray,
        };
    }

    public static parseBinary(data: ArrayBuffer) {
        const parsedAgentDataArray: AgentData[][] = [];
        const frameDataArray: FrameData[] = [];

        var enc = new TextEncoder(); // always utf-8
        var eofPhrase = enc.encode("\\EOFTHEFRAMEENDSHERE");

        const byteView = new Uint8Array(data);
        const length = byteView.length;
        const lastEOF = length - eofPhrase.length;
        let end = 0;
        let start = 0;

        while (end < lastEOF) {
            // contains Frame # | Time Stamp | # of Agents
            const frameDataView = new Float32Array(
                data.slice(start, start + 12)
            );

            // Find the next End of Frame signal
            for (; end < length; end = end + 4) {
                const curr = byteView.subarray(end, end + eofPhrase.length);
                if (curr.every((val, i) => val === eofPhrase[i])) {
                    break;
                }
            }

            const agentDataView = new Float32Array(data.slice(start + 12, end));

            const parsedFrameData = {
                time: frameDataView[1],
                frameNumber: frameDataView[0],
            };
            frameDataArray.push(parsedFrameData);

            // Parse the frameData
            // IMPORTANT: Order of this array needs to perfectly match the incoming data.
            const agentObjectKeys = [
                "vis-type",
                "instanceId",
                "type",
                "x",
                "y",
                "z",
                "xrot",
                "yrot",
                "zrot",
                "cr",
                "nSubPoints",
            ];
            const parsedAgentData: AgentData[] = [];
            const nSubPointsIndex = agentObjectKeys.findIndex(
                (ele) => ele === "nSubPoints"
            );

            const parseOneAgent = (agentArray): AgentData => {
                return agentArray.reduce(
                    (agentData, cur, i) => {
                        let key;
                        if (agentObjectKeys[i]) {
                            key = agentObjectKeys[i];
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
                    console.log("Frames inproperly concactenated");
                    //@TODO ERROR
                    break;
                }

                // each array length is variable based on how many subpoints the agent has
                const chunkLength = agentObjectKeys.length + nSubPoints;
                const remaining = agentDataView.length - dataIter;
                if (remaining < chunkLength - 1) {
                    // passed up in controller.handleLocalFileChange
                }

                const agentSubSetArray = agentDataView.subarray(
                    dataIter,
                    dataIter + chunkLength
                );
                if (agentSubSetArray.length < agentObjectKeys.length) {
                }

                const agent = parseOneAgent(agentSubSetArray);
                parsedAgentData.push(agent);
                dataIter = dataIter + chunkLength;
            }

            parsedAgentDataArray.push(parsedAgentData);

            start = end + eofPhrase.length;
            end = start;
        }

        return {
            parsedAgentDataArray,
            frameDataArray,
        };
    }

    public constructor() {
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.webWorker = util.ThreadUtil.createWebWorkerFromFunction(
                this.convertVisDataWorkFunctionToString()
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
        } else {
            this.webWorker = null;
        }
        this.frameCache = [];
        this.frameDataCache = [];
        this.cacheFrame = -1;
        this._dragAndDropFileInfo = null;
        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
        this.netBuffer = new ArrayBuffer();
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
    public hasLocalCacheForTime(timeNs: number): boolean {
        if (
            this.frameDataCache.length > 0 &&
            timeNs === 0 &&
            this.frameDataCache[0].time <= Number.EPSILON // allow for floating point errors
        ) {
            return true;
        } else if (this.frameDataCache.length < 2) {
            return false;
        }

        return (
            this.frameDataCache[0].time <= timeNs &&
            this.frameDataCache[this.frameDataCache.length - 1].time >= timeNs
        );
    }

    public gotoTime(timeNs: number): void {
        this.cacheFrame = -1;

        for (
            let frame = 0, numFrames = this.frameDataCache.length;
            frame < numFrames;
            frame++
        ) {
            const frameTime = this.frameDataCache[frame].time;
            if (timeNs < frameTime) {
                this.cacheFrame = Math.max(frame - 1, 0);
                break;
            }
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
        this.cacheFrame = 0;
    }

    public parseAgentsFromNetData(msg: VisDataMessage | ArrayBuffer): void {
        if (msg instanceof ArrayBuffer) {
            this.parseBinaryNetData(msg as ArrayBuffer);
            return;
        }

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
            const frames = VisData.parse(visDataMsg);
            Array.prototype.push.apply(
                this.frameDataCache,
                frames.frameDataArray
            );
            Array.prototype.push.apply(
                this.frameCache,
                frames.parsedAgentDataArray
            );
        }
    }

    private parseBinaryNetData(data: ArrayBuffer) {
        let eof = -1;

        // find last '/eof' signal in new data
        const byteView = new Uint8Array(data);

        var enc = new TextEncoder(); // always utf-8
        var eofPhrase = enc.encode("\\EOFTHEFRAMEENDSHERE");

        let index = byteView.length - eofPhrase.length;
        for (; index > 0; index = index - 4) {
            const curr = byteView.subarray(index, index + eofPhrase.length);
            if (curr.every((val, i) => val === eofPhrase[i])) {
                eof = index;
                break;
            }
        }

        if (eof > 0) {
            const frame = data.slice(0, eof);

            let tmp = new ArrayBuffer(
                this.netBuffer.byteLength + frame.byteLength
            );
            new Uint8Array(tmp).set(new Uint8Array(this.netBuffer));
            new Uint8Array(tmp).set(
                new Uint8Array(frame),
                this.netBuffer.byteLength
            );

            // Losing WebGL context, memory greatly increases,
            //  long hang-up in VisAgent.ts updateFiber
            //  many fibers in crashing frame
            //  is the 'crash frame' the same?
            const frames = VisData.parseBinary(tmp);
            if (
                frames.frameDataArray.length > 0 &&
                frames.frameDataArray[0].frameNumber === 0
            ) {
                this.clearCache(); // new data has arrived
            }

            Array.prototype.push.apply(
                this.frameDataCache,
                frames.frameDataArray
            );
            Array.prototype.push.apply(
                this.frameCache,
                frames.parsedAgentDataArray
            );

            // Save remaining data for later processing
            const remainder = data.slice(eof + eofPhrase.length);
            this.netBuffer = new ArrayBuffer(remainder.byteLength);
            new Uint8Array(this.netBuffer).set(new Uint8Array(remainder));
        } else {
            // Append the new data, and wait until eof
            this.netBuffer = new ArrayBuffer(data.byteLength);
            new Uint8Array(this.netBuffer).set(new Uint8Array(data));
        }
    }

    // for use w/ a drag-and-drop trajectory file
    //  save a file for playback
    // errors passed up in controller.handleLocalFileChange
    public cacheJSON(visDataMsg: VisDataMessage): void {
        if (this.frameCache.length > 0) {
            throw new Error(
                "cache not cleared before cacheing a new drag-and-drop file"
            );
        }

        const frames = VisData.parse(visDataMsg);
        Array.prototype.push.apply(this.frameDataCache, frames.frameDataArray);
        Array.prototype.push.apply(
            this.frameCache,
            frames.parsedAgentDataArray
        );
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

    // error passed up in controller.handleLocalFileChange
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

    public convertVisDataWorkFunctionToString(): string {
        // e.data is of type VisDataMessage
        return `function visDataWorkerFunc() {
        self.addEventListener('message', (e) => {
            const visDataMsg = e.data;
            const {
                frameDataArray,
                parsedAgentDataArray,
            } = ${VisData.parse}(visDataMsg)

            postMessage({
                frameDataArray,
                parsedAgentDataArray,
            });
        }, false);
        }`;
    }
}

export { VisData };
export default VisData;
