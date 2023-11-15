import { ArrayBufferTarget, Muxer } from "mp4-muxer";

// TODO: this is working but the type is throwing an error, what is best practice here?

class Recorder {
    private canvasEl: HTMLCanvasElement;
    private encoder: VideoEncoder;
    private frameCounter: number;
    private trackProcessor: MediaStreamTrackProcessor;
    private reader: ReadableStreamDefaultReader<VideoFrame>;
    private muxer?: Muxer<ArrayBufferTarget>;
    private isRecording: boolean;
    private trajectoryTitle: string;

    constructor(canvasEl: HTMLCanvasElement, trajectoryTitle: string) {
        // this is defined in the Viewer component
        // TODO should this be handled differently to make it more flexible when embedding in other applications
        this.canvasEl = canvasEl;
        this.trajectoryTitle = trajectoryTitle;
        // VideoEncoder sends chunks of frame data to the muxer
        this.encoder = new VideoEncoder({
            output: (chunk, meta) => {
                if (this.isRecording && this.muxer) {
                    this.muxer?.addVideoChunk(chunk, meta);
                }
            },
            error: this.handleError,
        });
        this.frameCounter = 0;
        this.isRecording = false;
    }

    private handleError(error: DOMException) {
        console.error("Encoder error:", error);
    }

    async setupStream(): Promise<void> {
        try {
            // returns a media stream captured from the viewer canvas
            // more details here: https://developer.chrome.com/en/articles/webcodecs/
            const stream = this.canvasEl.captureStream();
            const track = stream.getVideoTracks()[0];
            // MediaStreamTrackProcessor makes the captured stream readable
            this.trackProcessor = new MediaStreamTrackProcessor(track);
            this.reader = this.trackProcessor.readable.getReader();

            const config: VideoEncoderConfig = {
                codec: "avc1.420028", // TODO: do we want different configs?
                width: this.canvasEl.width,
                height: this.canvasEl.height,
            };
            const { supported, config: supportedConfig } =
                await VideoEncoder.isConfigSupported(config);
            if (supported && supportedConfig) {
                this.encoder.configure(config);
            } else {
                console.log("unsupported config");
            }

            this.muxer = new Muxer({
                target: new ArrayBufferTarget(),
                video: {
                    codec: "avc",
                    width: this.canvasEl.width,
                    height: this.canvasEl.height,
                },
            });
            this.isRecording = true;
            this.readFrames();
        } catch (error) {
            this.handleError(error);
        }
    }

    private async readFrames(): Promise<void> {
        while (this.isRecording) {
            const result = await this.reader.read();
            if (result.done) break;

            const frame = result.value;
            if (this.encoder.encodeQueueSize > 2) {
                frame.close(); // Drop the frame if encoder is overwhelmed
            } else {
                // if recording and the queue is not full, encode the frame and then close it
                // encoder is passing chunks to muxer
                this.frameCounter++;
                const keyFrame = this.frameCounter % 150 === 0;
                this.encoder.encode(frame, { keyFrame });
                frame.close();
            }
        }
    }

    async onCompletedRecording(): Promise<void> {
        this.isRecording = false;
        await this.encoder.flush();

        if (!this.muxer) {
            throw new Error(
                "No muxer found to convert video. Something may have gone wrong internally during export setup."
            );
        }

        this.muxer.finalize();
        const { buffer } = this.muxer.target;

        // create a blob from the muxer output  and download it
        const videoBlob = new Blob([buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(videoBlob);
        this.download(this.trajectoryTitle + ".mp4", url);

        URL.revokeObjectURL(url);
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

export default Recorder;
