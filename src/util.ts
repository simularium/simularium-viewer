import ISimulariumFile from "./simularium/ISimulariumFile";
import JsonFileReader from "./simularium/JsonFileParser";
import BinaryFileReader from "./simularium/BinaryFileParser";

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
        return pathOrUrl;
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

export function isBinarySimulariumFile(fileContents: Blob): Promise<boolean> {
    const first16blob: Blob = fileContents.slice(0, 16);
    // compare this with "SIMULARIUMBINARY"
    return first16blob.text().then((text) => {
        return text === "SIMULARIUMBINARY";
    });
}

export function loadSimulariumFile(file: File): Promise<ISimulariumFile> {
    return isBinarySimulariumFile(file)
        .then((isBinary): Promise<ArrayBuffer | string> => {
            if (isBinary) {
                return file.arrayBuffer();
            } else {
                return file.text();
            }
        })
        .then((fileContents: ArrayBuffer | string) => {
            if (typeof fileContents === "string") {
                console.log("TEXT JSON FILE");
                return new JsonFileReader(JSON.parse(fileContents as string));
            } else {
                console.log("BINARY FILE");
                // better be arraybuffer
                return new BinaryFileReader(fileContents as ArrayBuffer);
            }
        });
}
