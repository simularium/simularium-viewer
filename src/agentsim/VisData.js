import * as util from './ThreadUtil';

/**
    * Parse Agents from Net Data
* */
class VisData {

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

    static parse(visDataMsg) {
        // IMPORTANT: Order of this array needs to perfectly match the incoming data.
        const agentObjectKeys = ['vis-type', 'type', 'x', 'y', 'z', 'xrot', 'yrot', 'zrot', 'cr', 'nSubPoints'];
        const visData = visDataMsg.data;
        const parsedAgentData = [];
        const nSubPointsIndex = agentObjectKeys.findIndex((ele) => ele === 'nSubPoints');


        const parseOneAgent = (agentArray) => {
            return agentArray.reduce((agentData, cur, i) => {
                let key;
                if (agentObjectKeys[i]) {
                    key = agentObjectKeys[i];
                    agentData[key] = cur;
                } else if (i < agentArray.length + agentData.nSubPoints){
                    agentData.subpoints.push(cur);
                }
                return agentData;
            }, { subpoints: [] })
        }

        while (visData.length) {
            const nSubPoints = visData[nSubPointsIndex];
            const chunckLength = agentObjectKeys.length + nSubPoints; // each array length is varible based on how many subpoints the agent has
            const agentSubSetArray = visData.splice(0, chunckLength); // cut off the array of 1 agent data from front of the array;
            if (agentSubSetArray.length < agentObjectKeys.length) {
                throw Error('malformed data: indexing off');
            }
            parsedAgentData.push(parseOneAgent(agentSubSetArray))
        }

        const frameData = {
            time: visDataMsg.time,
            frameNumber: visDataMsg.frameNumber,
        }

        return {
            frameData,
            parsedAgentData,
        };
    }

    constructor() {
        this.mcolorVariant = 50;

        if(util.ThreadUtil.browserSupportsWebWorkers())
        {
            this.webWorker = util.ThreadUtil.createWebWorkerFromFunction(
                this.convertVisDataWorkFunctionToString(),
            );

            this.webWorker.onmessage = (event) => {
                this.mframeDataCache.push(event.data.frameData);
                this.mframeCache.push(event.data.parsedAgentData);
            };
        } else {
            this.webWorker = null;
        }

        this.mcolors = [
            0x6ac1e5,
            0xff2200,
            0xee7967,
            0xff6600,
            0xd94d49,
            0xffaa00,
            0xffcc00,
            0x00ccff,
            0x00aaff,
            0x8048f3,
            0x07f4ec,
            0x79bd8f,
            0x8800ff,
            0xaa00ff,
            0xcc00ff,
            0xff00cc,
            0xff00aa,
            0xff0088,
            0xff0066,
            0xff0044,
            0xff0022,
            0xff0000,
            0xccff00,
            0xaaff00,
            0x88ff00,
            0x00ffcc,
            0x66ff00,
            0x44ff00,
            0x22ff00,
            0x00ffaa,
            0x00ff88,
            0x00ffaa,
            0x00ffff,
            0x0066ff,

        ];

        this.mframeCache = [];
        this.mframeDataCache = [];
        this.mcacheFrame = -1;

        this.frameToWaitFor = 0;
        this.lockedForFrame = false;
    }

    get colors() { return this.mcolors; }

    get time() { return this.mcacheFrame < this.mframeDataCache.length ? this.mframeDataCache[this.mcacheFrame] : -1 }

    get colorVariant() { return this.mcolorVariant; }

    set colorVariant(val) { this.mcolorVariant = val; }

    /**
    *   Functions to check update
    * */
    hasLocalCacheForTime(timeNs) {
        if(this.mframeDataCache.length === 1 && timeNs === 0) { return true; }

        if(this.mframeDataCache.length < 2) { return false; }

        let start = this.mframeDataCache[0].time;
        let end = this.mframeDataCache[this.mframeDataCache.length - 1].time;

        return this.mframeDataCache[0].time <= timeNs &&
            this.mframeDataCache[this.mframeDataCache.length - 1].time >= timeNs;
    }

    playFromTime(timeNs) {
        this.mcacheFrame = -1;

        for(let frame = 0, numFrames = this.mframeDataCache.length;
            frame < numFrames;
            frame++)
        {
            let frameTime = this.mframeDataCache[frame].time;
            if(timeNs < frameTime)
            {
                this.mcacheFrame = frame;
                break;
            }
        }
    }

    atLatestFrame() {
        if(this.mcacheFrame === -1 && this.mframeCache.length > 0) { return false; }

        return this.mcacheFrame >= (this.mframeCache.length - 1);
    }

    latestSimTimeCachedLocally() {
        if(this.mframeDataCache === null || this.mframeDataCache.length === 0) { return -1; }
        return this.mframeDataCache[this.mframeDataCache.length -1].time;
    }

    currentFrame() {
        if(this.mframeCache.length === 0) {
            return {};
        } else if(this.mcacheFrame === -1) {
            this.mcacheFrame = 0;
            return this.mframeCache[0];
        }

        return this.mcacheFrame < this.mframeCache.length ? this.mframeCache[this.mcacheFrame] : {};
    }

    gotoNextFrame() {
        if(!this.atLatestFrame())
        {
            this.mcacheFrame = this.mcacheFrame + 1;
        }
    }

    /**
    * Data management
    * */
    WaitForFrame(frameNumber) {
        this.frameToWaitFor = frameNumber;
        this.lockedForFrame = true;
    }

    cacheJSON(visDataFrame) {
        let frame = VisData.parse(visDataFrame);
        this.mframeCache.push(frame.parsedAgentData);
        this.mframeDataCache.push(frame.frameData);
    }

    clearCache() {
        this.mframeCache = [];
        this.mframeDataCache = [];
        this.mcacheFrame = 0;
    }

    parseAgentsFromNetData(visDataMsg) {
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

        if(this.lockedForFrame === true)
        {
            if(visDataMsg.bundleData[0].frameNumber !== this.frameToWaitFor) {
                // This object is waiting for a frame with a specified frame number
                //  and  the arriving frame didn't match it
                return;
            } else {
                this.lockedForFrame = false;
                this.frameToWaitFor = 0;
            }
        }

        visDataMsg.bundleData.forEach((dataFrame) => {
            if (util.ThreadUtil.browserSupportsWebWorkers() && this.webWorker !== null) {
                this.webWorker.postMessage(dataFrame);
            } else {
                let newFrame = VisData.parse(dataFrame);
                this.mframeCache.push(newFrame.parsedAgentData);
                this.mframeDataCache.push(newFrame.frameData);
            }
        });
    }

    numberOfAgents() {
        return Object.keys(this.currentAgentDataFrame).length;
    }

    convertVisDataWorkFunctionToString() {
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
        }`

    }

}

export { VisData };
export default VisData;
