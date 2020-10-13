class FrontEndError extends Error {
    public htmlData: string;
    constructor(htmlData = "", ...params: string[]) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(...params);

        this.name = "FrontEndError";
        this.htmlData = htmlData;
    }
}

export default FrontEndError;
