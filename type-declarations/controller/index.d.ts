export default class AgentSimController {
    private netConnection;
    private simParameters;
    private visData;
    constructor(netConnectionSettings: any, params: any);
    start(): void;
    stop(): void;
    pause(): void;
    playFromCache(): void;
    resume(): void;
    changeFile(newFile: any): void;
}
