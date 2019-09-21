export default class AgentSimController {
    netConnection: any;
    simParameters: any;
    visData: any;
    constructor(netConnectionSettings: any, params: any);
    start(): void;
    time(): void;
    stop(): void;
    pause(): void;
    connect(): any;
    numberOfFrames(): any;
    timeStepSize(): any;
    initializeTrajectoryFile(): void;
    playFromFrame(frameNumber: any): void;
    playFromTime(timeNs: any): void;
    playOneFrame(frameNumber: any): void;
    resume(): void;
    changeFile(newFile: any): void;
}
