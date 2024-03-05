import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { DEFAULT_FRAME_RATE } from "../constants";

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
export class FrameRecorder {
    private getCanvas: () => HTMLCanvasElement | null;
    private handleFile: (videoBlob: Blob) => void;
    private encoder: VideoEncoder | null;
    private muxer?: Muxer<ArrayBufferTarget>;
    public isRecording: boolean;
    private frameIndex: number;
    public supportedBrowser: boolean;
    private frameRate: number;

    constructor(
        getCanvas: () => HTMLCanvasElement | null,
        handleFile: (videoBlob: Blob) => void
    ) {
        this.getCanvas = getCanvas;
        this.handleFile = handleFile;
        this.encoder = null;
        this.isRecording = false;
        this.frameIndex = 0;
        this.supportedBrowser = "VideoEncoder" in window;
        this.frameRate = DEFAULT_FRAME_RATE;
    }

    private async setup(): Promise<void> {
        const canvas = this.getCanvas();
        if (canvas) {
            const roundedWidth = Math.ceil(canvas.width / 2) * 2;
            const roundedHeight = Math.ceil(canvas.height / 2) * 2;
            try {
                // VideoEncoder sends chunks of frame data to the muxer.
                // Previously made one encoder in the constructor but
                // making a new one during setup() prevents a bug where
                // frames returned blank (stale canvas reference?)
                this.encoder = new VideoEncoder({
                    output: (chunk, meta) => {
                        if (this.isRecording && this.muxer) {
                            this.muxer?.addVideoChunk(chunk, meta);
                        }
                    },
                    error: (error) => {
                        throw new Error("Encoder error: " + error);
                    },
                });
                const config: VideoEncoderConfig = {
                    // High profile, level 4. Could switch to lower level if latency seems to be an issue
                    codec: "avc1.640028",
                    width: roundedWidth,
                    height: roundedHeight,
                    framerate: this.frameRate,
                    bitrate: 1e7,
                    bitrateMode: "constant",
                    latencyMode: "realtime",
                };
                const { supported, config: supportedConfig } =
                    await VideoEncoder.isConfigSupported(config);
                if (supported && supportedConfig) {
                    this.encoder.configure(config);
                } else {
                    throw new Error("Unsupported video encoder configuration");
                }
                // Muxer will handle the conversion from raw video data to mp4
                this.muxer = new Muxer({
                    target: new ArrayBufferTarget(),
                    video: {
                        codec: "avc",
                        width: canvas.width,
                        height: canvas.height,
                    },
                });
                this.frameIndex = 0;
            } catch (error) {
                throw new Error("Error setting up video encoder: " + error);
            }
        }
    }

    public async start(): Promise<void> {
        try {
            await this.setup();
            this.isRecording = true;
        } catch (e) {
            console.log("setup failed", e);
            return;
        }
    }

    public async stop(): Promise<void> {
        this.isRecording = false;
        await this.onCompletedRecording();
    }

    public onFrame(): void {
        if (!this.isRecording) {
            return;
        }
        if (this.encoder) {
            if (this.encoder.encodeQueueSize > 2) {
                console.log("Dropping frame, too many frames in flight");
                return;
            }
            const canvas = this.getCanvas();
            if (canvas) {
                // Add a keyframe every second: https://en.wikipedia.org/wiki/Key_frame
                const keyFrame = this.frameIndex % this.frameRate === 0;
                const timestampMicroseconds =
                    (this.frameIndex / this.frameRate) * 1_000_000;
                const durationMicroseconds = 1_000_000 / this.frameRate;
                const newFrame = new VideoFrame(canvas, {
                    timestamp: timestampMicroseconds,
                    duration: durationMicroseconds,
                });
                this.encoder.encode(newFrame, {
                    keyFrame,
                });
                newFrame.close();
            }
            this.frameIndex += 1;
        }
    }

    private async onCompletedRecording(): Promise<void> {
        if (!this.encoder) {
            throw new Error("No encoder found to convert video");
        }
        await this.encoder.flush();
        if (!this.muxer) {
            throw new Error("No muxer found to convert video.");
        }
        this.muxer.finalize();
        const { buffer } = this.muxer.target;

        // Create a blob from the muxer output and pass it to the front end.
        const videoBlob = new Blob([buffer], { type: "video/mp4" });
        this.handleFile(videoBlob);
    }
}

export default FrameRecorder;
