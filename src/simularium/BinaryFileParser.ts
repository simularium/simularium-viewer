export default class BinaryFileReader {
    fileContents: ArrayBuffer;
    constructor(fileContents: ArrayBuffer) {
        this.fileContents = fileContents;
    }
}
