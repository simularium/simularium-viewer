import * as util from './ThreadUtil';

function unpackNetData(visDataMsg) {
    const outAgentData = {};
    let agentCounter = 0;
    const visData = visDataMsg.data;
    const sizeOfData = visData.length;

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
    for (let i = 0; i < sizeOfData;) {
        const agentData = {};
        agentData['vis-type'] = visData[i]; i += 1; // read the first property
        agentData.type = visData[i]; i += 1; // the second property,
        agentData.x = visData[i]; i += 1;// ...
        agentData.y = visData[i]; i += 1;
        agentData.z = visData[i]; i += 1;
        agentData.xrot = visData[i]; i += 1;
        agentData.yrot = visData[i]; i += 1;
        agentData.zrot = visData[i]; i += 1;
        agentData.cr = visData[i]; i += 1;
        const nSubPoints = visData[i]; i += 1;

        /**
        *   this is a trait that is variable in length
        *   this is also why we cant use a calculable offset
        *   and need to step 'i' through the data
        * */
        const subpoints = [];
        for (let j = 0; j < nSubPoints; j += 1) {
            subpoints[j] = visData[i]; i += 1;
        }

        agentData.subpoints = subpoints;
        outAgentData[agentCounter] = agentData;
        agentCounter += 1;
    }

    return outAgentData;
}

function visDataWorkerFunc() {
/* eslint-disable-next-line no-restricted-globals */
    self.addEventListener('message', (e) => {
        const visDataMsg = e.data;
        const parsedAgentData = {};
        /**
        *   A copy of the above function 'unpackNetData'
        *   please see above for description
        *   duplicated here for the web-worker
        * */
        let agentCounter = 0;
        const visData = visDataMsg.data;
        const sizeOfData = visData.length;
        for (let i = 0; i < sizeOfData;) {
            const agentData = {};
            agentData['vis-type'] = visData[i]; i += 1;
            agentData.type = visData[i]; i += 1;
            agentData.x = visData[i]; i += 1;
            agentData.y = visData[i]; i += 1;
            agentData.z = visData[i]; i += 1;
            agentData.xrot = visData[i]; i += 1;
            agentData.yrot = visData[i]; i += 1;
            agentData.zrot = visData[i]; i += 1;
            agentData.cr = visData[i]; i += 1;
            const nSubPoints = visData[i]; i += 1;

            const subpoints = [];
            for (let j = 0; j < nSubPoints; j += 1) {
                subpoints[j] = visData[i]; i += 1;
            }

            agentData.subpoints = subpoints;
            parsedAgentData[agentCounter] = agentData;
            agentCounter += 1;
        }

        const frameData = {
            time: visDataMsg.time,
            frameNumber: visDataMsg.frame_number,
        }
        postMessage({
            frameData,
            parsedAgentData,
        });
    }, false);
}

class VisData {
    constructor() {
        this.currentAgentDataFrame = null;
        this.agentsUpdated = false;
        this.mcolorVariant = 50;

        this.webWorker = util.ThreadUtil.createWebWorkerFromFunction(
            visDataWorkerFunc.toString(),
        );

        this.webWorker.onmessage = (event) => {
            this.agentsUpdated = true;
            console.log(event.data.frameData)
            this.currentTimeAndFrame = event.data.frameData;
            this.currentAgentDataFrame = event.data.parsedAgentData;
        };

        this.mcolors = [
            0xff0000, 0xff2200, 0xff4400, 0xff6600,
            0xff8800, 0xffaa00, 0xffcc00,
            0xffff00, 0xccff00, 0xaaff00,
            0x88ff00, 0x66ff00, 0x44ff00, 0x22ff00,
            0x00ff00, 0x00ff22, 0x00ff44, 0x00ff66,
            0x00ff88, 0x00ffaa, 0x00ffcc,
            0x00ffff, 0x00ccff, 0x00aaff,
            0x0088ff, 0x0066ff, 0x0044ff, 0x0022ff,
            0x0000ff, 0x2200ff, 0x4400ff, 0x6600ff,
            0x8800ff, 0xaa00ff, 0xcc00ff,
            0xff00ff, 0xff00cc, 0xff00aa,
            0xff0088, 0xff0066, 0xff0044, 0xff0022,
            0xff0000,
        ];
    }

    get colors() { return this.mcolors; }

    get agents() { return this.currentAgentDataFrame; }

    get time() { return this.currentTimeAndFrame }

    get colorVariant() { return this.mcolorVariant; }

    set colorVariant(val) { this.mcolorVariant = val; }

    /**
    *   Functions to check update
    * */
    hasNewData() {
        return this.agentsUpdated;
    }

    newDataHasBeenHandled() {
        this.agentsUpdated = false;
    }

    /**
    * Data management
    * */
    reset() {
        this.agentsUpdated = false;
        this.currentAgentDataFrame = null;
    }

    /**
    * Parse Agents from Net Data
    * */
    static parse(visDataMsg) {
        const parsedAgentData = unpackNetData(visDataMsg);

        return parsedAgentData;
    }

    parseAgentsFromNetData(visDataMsg) {
        if (this.agentsUpdated) { return; } // last update not handled yet
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.webWorker.postMessage(visDataMsg);
        } else {
            this.currentAgentDataFrame = VisData.parse(visDataMsg);
            console.log(this.currentAgentDataFrame)
            this.agentsUpdated = true;
        }
    }

    numberOfAgents() {
        return Object.keys(this.currentAgentDataFrame).length;
    }
}

export { VisData };
export default VisData;
