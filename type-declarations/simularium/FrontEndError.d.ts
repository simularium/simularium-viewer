export declare enum ErrorLevel {
    ERROR = "error",
    INFO = "info",
    WARNING = "warning"
}
export declare class FrontEndError extends Error {
    htmlData: string;
    level: ErrorLevel;
    constructor(message: string, level?: ErrorLevel, htmlData?: string, ...params: string[]);
}
