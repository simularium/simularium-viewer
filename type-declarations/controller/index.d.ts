export default class AgentSimController {
    private netConnection;
    private simParameters;
    private visData;
    constructor(netConnectionSettings: any, params: any);
    start(): void;
    time(): void;
    stop(): void;
    pause(): void;
    numberOfFrames(): any;
    timeStepSize(): any;
    playFromFrame(frameNumber: any): void;
    playFromTime(timeNs: any): void;
    playOneFrame(frameNumber: any): void;
    resume(): void;
    changeFile(newFile: any): void;
}
