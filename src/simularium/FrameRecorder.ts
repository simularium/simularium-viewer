import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { ErrorLevel, FrontEndError } from "./FrontEndError";

export class FrameRecorder {
    private getCanvas: () => HTMLCanvasElement | null;
    private handleBlob: (videoBlob: Blob) => void;
    private encoder: VideoEncoder | null;
    private muxer?: Muxer<ArrayBufferTarget>;
    public isRecording: boolean;
    private frameIndex: number;

    constructor(
        getCanvas: () => HTMLCanvasElement | null,
        handleBlob: (videoBlob: Blob) => void
    ) {
        this.getCanvas = getCanvas;
        this.handleBlob = handleBlob;
        this.encoder = null;
        this.isRecording = false;
        this.frameIndex = 0;
    }

    private handleError(error: DOMException) {
        console.error("Encoder error:", error);
    }

    async setup(): Promise<void> {
        const canvas = this.getCanvas();
        if (canvas !== null) {
            try {
                // VideoEncoder sends chunks of frame data to the muxer
                // was making one encoder in the constructor but it was
                // leading a bug of stale canvas frames with no data
                // after the simularium file was changed
                this.encoder = new VideoEncoder({
                    output: (chunk, meta) => {
                        if (this.isRecording && this.muxer) {
                            this.muxer?.addVideoChunk(chunk, meta);
                        }
                    },
                    error: this.handleError,
                });
                const config: VideoEncoderConfig = {
                    codec: "avc1.420028",
                    width: canvas.width,
                    height: canvas.height,
                };
                const { supported, config: supportedConfig } =
                    await VideoEncoder.isConfigSupported(config);
                if (supported && supportedConfig) {
                    console.log("supported config", supportedConfig);
                    this.encoder.configure(config);
                } else {
                    throw new FrontEndError(
                        "Unsupported video encoder configuration",
                        ErrorLevel.ERROR
                    );
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
                this.handleError(error as DOMException);
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

    public async onFrame(): Promise<void> {
        const canvas = this.getCanvas();
        if (!this.isRecording) {
            return;
        }
        // todo animate loop defines the frame rate at 60
        // should this be a shared constant?
        const keyFrame = this.frameIndex % 60 === 0;
        const timestampMicroseconds = this.frameIndex * 1_000_000;
        const durationMicroseconds = 1_000_000 / 60;
        if (canvas && this.encoder) {
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

    async onCompletedRecording(): Promise<void> {
        if (!this.encoder) {
            throw new FrontEndError(
                "No encoder found to convert video",
                ErrorLevel.ERROR,
                "Something may have gone wrong internally during export setup."
            );
            return;
        }
        await this.encoder.flush();
        if (!this.muxer) {
            throw new Error(
                "No muxer found to convert video. Something may have gone wrong internally during export setup."
            );
        }
        this.muxer.finalize();
        const { buffer } = this.muxer.target;

        // Create a blob from the muxer output and download it
        const videoBlob = new Blob([buffer], { type: "video/mp4" });
        this.handleBlob(videoBlob);
    }
}

export default FrameRecorder;
