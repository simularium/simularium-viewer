import { ArrayBufferTarget, Muxer } from "mp4-muxer";

export class FrameRecorder {
    private getCanvas: () => HTMLCanvasElement | null;
    private handleBlob: (videoBlob: Blob) => void;
    private encoder: VideoEncoder | null;
    private muxer?: Muxer<ArrayBufferTarget>;
    public isRecording: boolean;
    private timeStamp: number;

    constructor(
        getCanvas: () => HTMLCanvasElement | null,
        handleBlob: (videoBlob: Blob) => void
    ) {
        // VideoEncoder sends chunks of frame data to the muxer
        // was making one encoder here but it was leading a strange issue of stale canvas data
        // nulling here since we are going to make a new one every time in setup()
        this.getCanvas = getCanvas;
        this.handleBlob = handleBlob;
        this.encoder = null;
        this.isRecording = false;
        this.timeStamp = 0;
    }

    private handleError(error: DOMException) {
        console.error("Encoder error:", error);
    }

    async setup(): Promise<void> {
        const canvas = this.getCanvas();
        if (canvas !== null) {
            try {
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
                    // todo error handling
                    console.log("unsupported config");
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
                this.timeStamp = 0;
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
        const durationMicroseconds = 1_000_000 / 60;
        if (canvas && this.encoder) {
            const newFrame = new VideoFrame(canvas, {
                timestamp: this.timeStamp,
                duration: durationMicroseconds,
            });
            this.encoder.encode(newFrame, {
                // todo add keyframe support
                // keyFrame: true,
            });
            newFrame.close();
        } else {
            // to do error hanlding
            console.log("no canvas or encoder");
        }

        this.timeStamp += durationMicroseconds;
    }

    async onCompletedRecording(): Promise<void> {
        if (!this.encoder) {
            // todo error handling
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
