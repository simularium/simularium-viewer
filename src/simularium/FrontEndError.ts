export enum ErrorLevel {
    ERROR = "error",
    INFO = "info",
    WARNING = "warning",
}

class FrontEndError extends Error {
    public htmlData: string;
    public level: ErrorLevel;
    constructor(htmlData = "", level = ErrorLevel.ERROR, ...params: string[]) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(...params);
        this.name = "FrontEndError";
        this.level = level;
        this.htmlData = htmlData;
    }
}

export default FrontEndError;
