import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { MediaStreamTrackProcessor as MediaStreamTrackProcessorType } from "@types/dom-mediacapture-transform";
// TODO: the code below solves 2/3 typeCheck errors
// but it doesn't solve the error on line 65
// and it's hacky and incomplete, I'd appreciate guidance
// during review on a better way to to do this.
// The code runs and does the job with this error present...

declare global {
    interface HTMLCanvasElement {
        captureStream(frameRate?: number): MediaStream;
    }
    interface Window {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        MediaStreamTrackProcessor: MediaStreamTrackProcessorType;
    }
}
// eslint-disable-next-line @typescript-eslint/naming-convention
const MediaStreamTrackProcessor = window.MediaStreamTrackProcessor;

export class StreamRecorder {
    private canvasEl: HTMLCanvasElement;
    private encoder: VideoEncoder;
    private frameCounter: number;

    private trackProcessor: MediaStreamTrackProcessorType;
    private reader: ReadableStreamDefaultReader<VideoFrame> | null;
    private muxer?: Muxer<ArrayBufferTarget>;
    private isRecording: boolean;
    private trajectoryTitle: string;

    constructor(canvasEl: HTMLCanvasElement, trajectoryTitle: string) {
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
        this.reader = null;
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

            // TODO: in future we could let users specify config options?
            const fps = 30;
            const config: VideoEncoderConfig = {
                codec: "avc1.420028",
                width: this.canvasEl.width,
                height: this.canvasEl.height,
            };

            const stream = this.canvasEl.captureStream(fps);
            const track = stream.getVideoTracks()[0];
            // MediaStreamTrackProcessor makes the captured stream readable
            this.trackProcessor = new MediaStreamTrackProcessor(track);
            this.reader = this.trackProcessor.readable.getReader();

            const { supported, config: supportedConfig } =
                await VideoEncoder.isConfigSupported(config);
            if (supported && supportedConfig) {
                this.encoder.configure(config);
            } else {
                console.log("unsupported config");
            }
            // Muxer will handle the conversion from raw video data to mp4
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
            this.handleError(error as DOMException);
        }
    }

    private async readFrames(): Promise<void> {
        while (this.isRecording) {
            if (!this.reader) {
                return;
            }
            const result = await this.reader.read();
            if (result.done) break;

            const frame = result.value;
            // Drop the frame if encoder is overwhelmed
            if (this.encoder.encodeQueueSize > 2) {
                frame.close();
            } else {
                // this application of keyframes is straight from the docs
                // and will make the resulting file larger but also scrubbable
                // We could optimize/alter the frequency of keyframes?
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

        // Create a blob from the muxer output and download it
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

export default StreamRecorder;
