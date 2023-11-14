import { ArrayBufferTarget, Muxer } from "mp4-muxer";

class Recorder {
    private canvasEl: HTMLCanvasElement;
    private encoder: VideoEncoder;
    private frameCounter: number;
    private trackProcessor: MediaStreamTrackProcessor;
    private reader: ReadableStreamDefaultReader<VideoFrame>;
    private muxer?: Muxer<ArrayBufferTarget>;

    constructor(canvasEl: HTMLCanvasElement) {
        this.canvasEl = canvasEl;
        this.encoder = new VideoEncoder({
            // output: this.handleEncodedChunk,
            output: (chunk, meta) => this.muxer?.addVideoChunk(chunk, meta),
            error: this.handleError,
        });
        this.frameCounter = 0;
    }

    // private handleEncodedChunk(chunk: EncodedVideoChunk) {}

    private handleError(error: DOMException) {
        console.error("Encoder error:", error);
    }

    async setupStream(): Promise<void> {
        try {
            const stream = this.canvasEl.captureStream();
            const track = stream.getVideoTracks()[0];
            this.trackProcessor = new MediaStreamTrackProcessor(track);
            this.reader = this.trackProcessor.readable.getReader();

            this.encoder.configure({
                codec: "vp8", // You might want to choose a codec depending on your requirements
                width: this.canvasEl.width,
                height: this.canvasEl.height,
            });

            this.muxer = new Muxer({
                target: new ArrayBufferTarget(),
                video: {
                    codec: "avc",
                    width: this.canvasEl.width,
                    height: this.canvasEl.height,
                },
            });

            this.readFrames();
        } catch (error) {
            console.error("Error setting up stream:", error);
        }
    }

    private async readFrames(): Promise<void> {
        while (true) {
            const result = await this.reader.read();
            if (result.done) break;

            const frame = result.value;
            if (this.encoder.encodeQueueSize > 2) {
                frame.close(); // Drop the frame if encoder is overwhelmed
            } else {
                this.frameCounter++;
                const keyFrame = this.frameCounter % 150 === 0;
                this.encoder.encode(frame, { keyFrame });
                frame.close();
            }
        }
    }

        async onCompletedRecording(): Promise<void> {
        await this.encoder.flush();

        if (!this.muxer) {
            throw new Error("No muxer found to convert video. Something may have gone wrong internally during export setup.");
        }

        this.muxer.finalize();
        const { buffer } = this.muxer.target; // Ensure that 'target' and 'buffer' are correctly defined in your muxer

        // Create a Blob from the buffer and download the video file
        const videoBlob = new Blob([buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(videoBlob);
        //TODO set file name
        // this.download(`${this.options.prefix}.mp4`, url);
        this.download('movie.mp4', url);
        URL.revokeObjectURL(url);
    }

    private download(filename: string, url: string) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    }
}


export default Recorder;
