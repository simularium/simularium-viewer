/**
 * Records frames to an MP4 file using the WebCodecs API.
 * Resulting file is passed to the front end implementation
 * for download/use, via the handleFile() callback.
 *
 *
 * Note that the VideoCodecs API is unavailable in some browsers, including Firefox,
 * as of 2/6/2024. Viewport will not call these methods on firefox.
 *
 */
export declare class FrameRecorder {
    private getCanvas;
    private handleFile;
    private encoder;
    private muxer?;
    isRecording: boolean;
    private frameIndex;
    supportedBrowser: boolean;
    private frameRate;
    constructor(getCanvas: () => HTMLCanvasElement | null, handleFile: (videoBlob: Blob) => void);
    private setup;
    start(): Promise<void>;
    stop(): Promise<void>;
    onFrame(): void;
    private onCompletedRecording;
}
export default FrameRecorder;
