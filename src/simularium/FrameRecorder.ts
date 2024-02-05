import { ArrayBufferTarget, Muxer } from "mp4-muxer";

export class FrameRecorder {
    private getCanvas: () => HTMLCanvasElement | null;
    private encoder: VideoEncoder;
    private muxer?: Muxer<ArrayBufferTarget>;
    public isRecording: boolean;
    private timeStamp: number;
    private setUpCompleted: boolean;

    constructor(getCanvas: () => HTMLCanvasElement | null) {
        // VideoEncoder sends chunks of frame data to the muxer
        this.encoder = new VideoEncoder({
            output: (chunk, meta) => {
                if (this.isRecording && this.muxer) {
                    console.log("encoder output", chunk, meta);
                    this.muxer?.addVideoChunk(chunk, meta);
                }
            },
            error: this.handleError,
        });
        this.getCanvas = getCanvas;
        this.isRecording = false;
        this.setUpCompleted = false;
        this.timeStamp = 0;
    }

    private handleError(error: DOMException) {
        console.error("Encoder error:", error);
    }

    async setup(): Promise<void> {
        if (this.setUpCompleted) {
            return;
        }
        const canvas = this.getCanvas();
        if (canvas !== null) {
            try {
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
                    console.log("unsupported config");
                }
                console.log("encoder setup complete", this.encoder);
                // Muxer will handle the conversion from raw video data to mp4
                this.muxer = new Muxer({
                    target: new ArrayBufferTarget(),
                    video: {
                        codec: "avc",
                        width: canvas.width,
                        height: canvas.height,
                    },
                });
                console.log("muxer setup complete", this.muxer);
                this.timeStamp = 0;
                this.setUpCompleted = true;
            } catch (error) {
                this.handleError(error as DOMException);
            }
        }
    }

    public async start(): Promise<void> {
        //todo not always call set up on recorder but only when needed
        if (this.setUpCompleted) {
            this.isRecording = true;
            return;
        }
        try {
            await this.setup();
            console.log("setup complete");
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
        if (canvas) {
            const newFrame = new VideoFrame(canvas, {
                timestamp: this.timeStamp,
                duration: durationMicroseconds,
            });
            this.encoder.encode(newFrame, {
                // todo add keyframe support
                // keyFrame: true,
            });
            newFrame.close();
        }

        this.timeStamp += durationMicroseconds;
    }

    async onCompletedRecording(): Promise<void> {
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
        const url = URL.createObjectURL(videoBlob);
        // todo get correct file title
        // this.download(this.trajectoryTitle + ".mp4", url);
        this.download("simularium.mp4", url);
        URL.revokeObjectURL(url);
        this.setUpCompleted = false;
        await this.setup();
    }

    private download(filename: string, url: string) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    }
}

export default FrameRecorder;
