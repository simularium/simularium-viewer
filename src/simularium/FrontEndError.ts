export enum ErrorLevel {
    ERROR = "error",
    INFO = "info",
    WARNING = "warning",
}

class FrontEndError extends Error {
    public htmlData: string;
    public level: ErrorLevel;
    constructor(
        message: string,
        level = ErrorLevel.ERROR,
        htmlData = "",
        ...params: string[]
    ) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(...params);
        this.name = "FrontEndError";
        this.message = message;
        this.htmlData = htmlData;
        this.level = level;
    }
}

export default FrontEndError;
