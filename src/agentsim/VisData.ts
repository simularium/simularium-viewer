import * as util from "./ThreadUtil";

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

    public static parse(visDataMsg): ParsedBundle {
        let parsedAgentDataArray: AgentData[][] = [];
        let frameDataArray: FrameData[] = [];
        visDataMsg.bundleData.forEach(frame => {
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
            const visData = frame.data;
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

    public constructor() {
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.webWorker = util.ThreadUtil.createWebWorkerFromFunction(
                this.convertVisDataWorkFunctionToString()
            );

            this.webWorker.onmessage = event => {
                this.frameDataCache = this.frameDataCache.concat(
                    event.frameDataArray
                );
                this.frameCache = this.frameCache.concat(
                    event.parsedAgentDataArray
                );
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

        if (
            util.ThreadUtil.browserSupportsWebWorkers() &&
            this.webWorker !== null
        ) {
            this.webWorker.postMessage(visDataMsg);
        } else {
            let frames = VisData.parse(visDataMsg);
            this.frameDataCache = this.frameDataCache.concat(
                frames.frameDataArray
            );
            this.frameCache = this.frameCache.concat(
                frames.parsedAgentDataArray
            );
        }
    }

    // for use w/ a drag-and-drop trajectory file
    //  save a file for playback
    public cacheJSON(visDataMsg): void {
        if (this.frameCache.length > 0) {
            throw Error(
                "cache not cleared before cacheing a new drag-and-drop file"
            );
            return;
        }

        let frames = VisData.parse(visDataMsg);
        this.frameDataCache = this.frameDataCache.concat(frames.frameDataArray);
        this.frameCache = this.frameCache.concat(frames.parsedAgentDataArray);
    }

    public dragAndDropFileInfo() {
        let max: number[] = [0, 0, 0];
        let min: number[] = [0, 0, 0];

        this.frameCache.forEach(element => {
            let radius =
                Math.max.apply(
                    Math,
                    element.map(agent => {
                        return agent.cr;
                    })
                ) * 1.1;
            let maxx: number = Math.max.apply(
                Math,
                element.map(agent => {
                    return agent.x;
                })
            );
            let maxy: number = Math.max.apply(
                Math,
                element.map(agent => {
                    return agent.y;
                })
            );
            let maxz: number = Math.max.apply(
                Math,
                element.map(agent => {
                    return agent.z;
                })
            );

            let minx: number = Math.min.apply(
                Math,
                element.map(agent => {
                    return agent.x;
                })
            );
            let miny: number = Math.min.apply(
                Math,
                element.map(agent => {
                    return agent.y;
                })
            );
            let minz: number = Math.min.apply(
                Math,
                element.map(agent => {
                    return agent.z;
                })
            );

            max[0] = Math.max(max[0], 2 * maxx + radius);
            max[1] = Math.max(max[1], 2 * maxy + radius);
            max[2] = Math.max(max[2], 2 * maxz + radius);

            min[0] = Math.min(max[0], 2 * minx - radius);
            min[1] = Math.min(max[1], 2 * miny - radius);
            min[2] = Math.min(max[2], 2 * minz - radius);
        });

        return {
            boxSizeX: max[0] - min[0],
            boxSizeY: max[1] - min[0],
            boxSizeZ: max[2] - min[2],
            totalDuration: 1000,
            timeStepSize: 10,
        };
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
