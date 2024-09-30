import type { ISimulariumFile } from "./simularium/ISimulariumFile";
import JsonFileReader from "./simularium/JsonFileReader";
import BinaryFileReader from "./simularium/BinaryFileReader";
import { AGENT_OBJECT_KEYS, AgentData, CachedFrame } from "./simularium/types";
import { BYTES_PER_AGENT, BYTE_SIZE_64_BIT_NUM, nullAgent } from "./constants";

export const compareTimes = (
    time1: number,
    time2: number,
    timeStepSize: number,
    stepSizeFraction = 0.01
): number => {
    /*
    Compares two time values in a series by seeing whether they are within some
    small fraction of the time step size.

    Params:
        time1:          Any number
        time2:          Any number
        timeStepSize:   The step size in a time series

    Returns:
        1 if time1 > time2
        -1 if time1 < time2
        0 if time1 ~= time2
    */

    const epsilon = timeStepSize * stepSizeFraction;
    if (time1 - epsilon > time2) return 1;
    if (time1 + epsilon < time2) return -1;
    return 0;
};

export const checkAndSanitizePath = (pathOrUrl: string): string => {
    /**
     * if given a url, return it. If given a path, return it in the form "/filename" (if it already
     * has a forward slash, also return it unmodified)
     */
    const isUrlRegEX =
        /(https?:\/\/)([\w\-])+\.{1}([a-zA-Z]{2,63})([\/\w-]*)*\/?\??([^#\n\r]*)?#?([^\n\r]*)/g;
    if (isUrlRegEX.test(pathOrUrl)) {
        let url = pathOrUrl;
        if (url.includes("dropbox")) {
            url = url.replace("www.dropbox.com", "dl.dropboxusercontent.com");
        }
        return url;
    } else if (/\B\//g.test(pathOrUrl)) {
        return pathOrUrl;
    }
    return `/${pathOrUrl}`;
};

export function getFileExtension(pathOrUrl: string): string {
    // the file extension is considered to be all string contents after the last "."
    return (
        pathOrUrl.substring(pathOrUrl.lastIndexOf(".") + 1, pathOrUrl.length) ||
        pathOrUrl
    );
}

export function loadSimulariumFile(file: Blob): Promise<ISimulariumFile> {
    return BinaryFileReader.isBinarySimulariumFile(file)
        .then((isBinary): Promise<ArrayBuffer | string> => {
            if (isBinary) {
                return file.arrayBuffer();
            } else {
                return file.text();
            }
        })
        .then((fileContents: ArrayBuffer | string) => {
            if (typeof fileContents === "string") {
                return new JsonFileReader(JSON.parse(fileContents as string));
            } else {
                // better be arraybuffer
                return new BinaryFileReader(fileContents as ArrayBuffer);
            }
        });
}

export function calculateCachedSize(parsedAgentData: AgentData[]): number {
    let totalSize = 0;

    // Calculate the size of parsedAgentDataArray
    for (let j = 0; j < parsedAgentData.length; ++j) {
        const agent = parsedAgentData[j];
        totalSize += BYTES_PER_AGENT; // 10 number properties in AgentData (excluding subpoints)
        totalSize += agent.subpoints.length * BYTE_SIZE_64_BIT_NUM;
    }

    return (totalSize += 16); // should always be 16 bytes bceause its just one frame per message with octopus
}

export const nullCachedFrame = (): CachedFrame => {
    return {
        data: new ArrayBuffer(0),
        frameNumber: -1,
        time: -1,
        agentCount: -1,
        size: -1,
    };
};

export const getAgentDataFromBuffer = (
    view: Float32Array,
    offset: number
): AgentData => {
    const agentData: AgentData = nullAgent();
    for (let i = 0; i < AGENT_OBJECT_KEYS.length; i++) {
        agentData[AGENT_OBJECT_KEYS[i]] = view[offset + i];
    }
    const nSubPoints = agentData["nSubPoints"];
    agentData.subpoints = Array.from(
        view.subarray(
            offset + AGENT_OBJECT_KEYS.length,
            offset + AGENT_OBJECT_KEYS.length + nSubPoints
        )
    );
    return agentData;
};

export const getNextAgentOffset = (
    view: Float32Array,
    currentOffset: number
): number => {
    const nSubPoints = view[currentOffset + AGENT_OBJECT_KEYS.length - 1];
    return currentOffset + AGENT_OBJECT_KEYS.length + nSubPoints;
};
