import { AgentData, FrameData, TrajectoryFileInfo, EncodedTypeMapping, VisDataMessage } from "./types";
declare class VisData {
    private frameCache;
    private frameDataCache;
    private enableCache;
    private webWorker;
    private frameToWaitFor;
    private lockedForFrame;
    private cacheFrame;
    private _dragAndDropFileInfo;
    timeStepSize: number;
    private static parseOneBinaryFrame;
    private setupWebWorker;
    constructor();
    get currentFrameData(): FrameData;
    /**
     *   Functions to check update
     * */
    hasLocalCacheForTime(time: number): boolean;
    gotoTime(time: number): void;
    atLatestFrame(): boolean;
    currentFrame(): AgentData[];
    gotoNextFrame(): void;
    /**
     * Data management
     * */
    WaitForFrame(frameNumber: number): void;
    clearCache(): void;
    clearForNewTrajectory(): void;
    cancelAllWorkers(): void;
    setCacheEnabled(cacheEnabled: boolean): void;
    private addFramesToCache;
    private parseAgentsFromVisDataMessage;
    parseAgentsFromFrameData(msg: VisDataMessage | ArrayBuffer): void;
    parseAgentsFromNetData(msg: VisDataMessage | ArrayBuffer): void;
    cacheJSON(visDataMsg: VisDataMessage): void;
    set dragAndDropFileInfo(fileInfo: TrajectoryFileInfo | null);
    get dragAndDropFileInfo(): TrajectoryFileInfo | null;
    checkTypeMapping(typeMappingFromFile: EncodedTypeMapping): number[];
}
export { VisData };
export default VisData;
