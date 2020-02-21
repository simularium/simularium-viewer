import { NetConnection } from "../agentsim";
export default class AgentSimController {
    netConnection: NetConnection;
    visData: any;
    private networkEnabled;
    private isPaused;
    private fileChanged;
    private playBackFile;
    constructor(netConnectionSettings: any, params: any);
    readonly hasChangedFile: boolean;
    connect(): Promise<{}>;
    start(): Promise<void>;
    time(): void;
    stop(): void;
    pause(): void;
    paused(): boolean;
    initializeTrajectoryFile(): void;
    playFromTime(timeNs: any): void;
    resume(): void;
    changeFile(newFile: any): void;
    markFileChangeAsHandled(): void;
    getFile(): any;
    disableNetworkCommands(): void;
    cacheJSON(json: any): void;
    clearLocalCache(): void;
}
