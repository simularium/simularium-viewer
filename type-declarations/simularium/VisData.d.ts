import { AgentData, FrameData, TrajectoryFileInfo, EncodedTypeMapping, VisDataMessage } from "./types";
import type { ParsedBundle } from "./VisDataParse";
declare class VisData {
    private frameCache;
    private frameDataCache;
    private webWorker;
    private frameToWaitFor;
    private lockedForFrame;
    private cacheFrame;
    private netBuffer;
    private _dragAndDropFileInfo;
    timeStepSize: number;
    private static parseOneBinaryFrame;
    static parseBinary(data: ArrayBuffer): ParsedBundle;
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
    private addFramesToCache;
    private parseAgentsFromVisDataMessage;
    parseAgentsFromLocalFileData(msg: VisDataMessage | ArrayBuffer): void;
    parseAgentsFromNetData(msg: VisDataMessage | ArrayBuffer): void;
    private parseBinaryNetData;
    cacheJSON(visDataMsg: VisDataMessage): void;
    set dragAndDropFileInfo(fileInfo: TrajectoryFileInfo | null);
    get dragAndDropFileInfo(): TrajectoryFileInfo | null;
    checkTypeMapping(typeMappingFromFile: EncodedTypeMapping): number[];
}
export { VisData };
export default VisData;
