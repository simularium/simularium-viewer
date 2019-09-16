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
        this.currentAgentDataFrame = null;
        this.agentsUpdated = false;
        this.mcolorVariant = 50;

        this.webWorker = util.ThreadUtil.createWebWorkerFromFunction(
            this.convertVisDataWorkFunctionToString(),
        );

        this.webWorker.onmessage = (event) => {
            this.agentsUpdated = true;
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

    parseAgentsFromNetData(visDataMsg) {
        if (this.agentsUpdated) { return; } // last update not handled yet
        if (util.ThreadUtil.browserSupportsWebWorkers()) {
            this.webWorker.postMessage(visDataMsg);
        } else {
            this.currentAgentDataFrame = VisData.parse(visDataMsg);
            this.agentsUpdated = true;
        }
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
