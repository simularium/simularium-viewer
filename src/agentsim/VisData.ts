import * as util from "./ThreadUtil";

/**
 * Parse Agents from Net Data
 * */
interface AgentData {
    x: number;
    y: number;
    z: number;
    xrot: number;
    yrot: number;
    zrot: number;
    visType: number;
    type: number;
    cr: number;
    subpoints: number[];
}

interface FrameData {
    frameNumber: number;
    time: number;
}

interface ParsedFrame {
    frameData: FrameData;
    parsedAgentData: AgentData[];
}

class VisData {
    private frameCache: AgentData[][];
    private frameDataCache: FrameData[];
    private webWorker: Worker | null;

    private frameToWaitFor: number;
    private lockedForFrame: boolean;
    private cacheFrame: number;

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

    public static parse(visDataMsg): ParsedFrame {
        // IMPORTANT: Order of this array needs to perfectly match the incoming data.
        const agentObjectKeys = [
            "vis-type",
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
        const visData = visDataMsg.data;
        const parsedAgentData: AgentData[] = [];
        const nSubPointsIndex = agentObjectKeys.findIndex(
            ele => ele === "nSubPoints"
        );

        const parseOneAgent = (agentArray): AgentData => {
            return agentArray.reduce(
                (agentData, cur, i) => {
                    let key;
                    if (agentObjectKeys[i]) {
                        key = agentObjectKeys[i];
                        agentData[key] = cur;
                    } else if (i < agentArray.length + agentData.nSubPoints) {
                        agentData.subpoints.push(cur);
                    }
                    return agentData;
                },
                { subpoints: [] }
            );
        };

        while (visData.length) {
            const nSubPoints = visData[nSubPointsIndex];
            const chunckLength = agentObjectKeys.length + nSubPoints; // each array length is varible based on how many subpoints the agent has
            if (visData.length < chunckLength) {
                throw Error("malformed data: too few entries");
            }

            const agentSubSetArray = visData.splice(0, chunckLength); // cut off the array of 1 agent data from front of the array;
            if (agentSubSetArray.length < agentObjectKeys.length) {
                throw Error("malformed data: indexing off");
            }

            parsedAgentData.push(parseOneAgent(agentSubSetArray));
        }

        const frameData: FrameData = {
            time: visDataMsg.time,
            frameNumber: visDataMsg.frameNumber,
        };

        return {
            frameData,
            parsedAgentData,
        };
    }

    public constructor() {
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.webWorker = util.ThreadUtil.createWebWorkerFromFunction(
                this.convertVisDataWorkFunctionToString()
            );

            this.webWorker.onmessage = event => {
                this.frameDataCache.push(event.data.frameData);
                this.frameCache.push(event.data.parsedAgentData);
            };
        } else {
            this.webWorker = null;
        }

        this.frameCache = [];
        this.frameDataCache = [];
        this.cacheFrame = -1;

        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
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
    public hasLocalCacheForTime(timeNs): boolean {
        if (this.frameDataCache.length > 0 && timeNs === 0) {
            return true;
        } else if (this.frameDataCache.length < 2) {
            return false;
        }

        return (
            this.frameDataCache[0].time <= timeNs &&
            this.frameDataCache[this.frameDataCache.length - 1].time >= timeNs
        );
    }

    public gotoTime(timeNs): void {
        this.cacheFrame = -1;

        for (
            let frame = 0, numFrames = this.frameDataCache.length;
            frame < numFrames;
            frame++
        ) {
            let frameTime = this.frameDataCache[frame].time;
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
    public WaitForFrame(frameNumber): void {
        this.frameToWaitFor = frameNumber;
        this.lockedForFrame = true;
    }

    public clearCache(): void {
        this.frameCache = [];
        this.frameDataCache = [];
        this.cacheFrame = 0;
    }

    public parseAgentsFromNetData(visDataMsg): void {
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

        visDataMsg.bundleData.forEach(dataFrame => {
            if (
                util.ThreadUtil.browserSupportsWebWorkers() &&
                this.webWorker !== null
            ) {
                this.webWorker.postMessage(dataFrame);
            } else {
                let newFrame = VisData.parse(dataFrame);
                this.frameCache.push(newFrame.parsedAgentData);
                this.frameDataCache.push(newFrame.frameData);
            }
        });
    }

    public convertVisDataWorkFunctionToString(): string {
        return `function visDataWorkerFunc() {
        self.addEventListener('message', (e) => {
            const visDataMsg = e.data;
            const {
                frameData,
                parsedAgentData,
            } = ${VisData.parse}(visDataMsg)

            postMessage({
                frameData,
                parsedAgentData,
            });
        }, false);
        }`;
    }
}

export { VisData };
export default VisData;
