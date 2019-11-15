export default class AgentSimController {
    netConnection: any;
    simParameters: any;
    visData: any;
    private networkEnabled;
    private isPaused;
    constructor(netConnectionSettings: any, params: any);
    start(): void;
    time(): void;
    stop(): void;
    pause(): void;
    paused(): boolean;
    connect(): any;
    numberOfFrames(): any;
    timeStepSize(): any;
    initializeTrajectoryFile(): void;
    playFromFrame(frameNumber: any): void;
    playFromTime(timeNs: any): void;
    playOneFrame(frameNumber: any): void;
    gotoFrameAtTime(timeNs: any): void;
    gotoNextFrame(): void;
    gotoPreviousFrame(): void;
    resume(): void;
    changeFile(newFile: any): void;
    getFile(): any;
    disableNetworkCommands(): void;
    cacheJSON(json: any): void;
    clearLocahCache(): void;
}
