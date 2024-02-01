import { ArrayBufferTarget, Muxer } from "mp4-muxer";
// import { MediaStreamTrackProcessor as MediaStreamTrackProcessorType } from "dom-mediacapture-transform";

// TODO: the code below solves 2/3 typeCheck errors
// but it doesn't solve the error on line 65
// and it's hacky and incomplete, I'd appreciate guidance
// during review on a better way to to do this.
// The code runs and does the job with this error present...

// declare global {
//     interface HTMLCanvasElement {
//         captureStream(frameRate?: number): MediaStream;
//     }
//     interface Window {
//         // eslint-disable-next-line @typescript-eslint/naming-convention
//         MediaStreamTrackProcessor: MediaStreamTrackProcessorType;
//     }
// }
// eslint-disable-next-line @typescript-eslint/naming-convention
// const MediaStreamTrackProcessor = window.MediaStreamTrackProcessor;

interface CanvasElement extends HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
}

export class StreamRecorder {
    private canvasEl: CanvasElement;
    private encoder: VideoEncoder;
    private frameCounter: number;
    private currentFrame: number;
    private currentTime: number;
    private timeStep: number;

    private trackProcessor;
    private reader: ReadableStreamDefaultReader<VideoFrame> | null;
    private muxer?: Muxer<ArrayBufferTarget>;
    private isRecording: boolean;
    private finishedRecording: boolean;
    private timerId: number;
    private trajectoryTitle: string;
    private onCompleted: () => Promise<void>;

    constructor(
        canvasEl: CanvasElement,
        trajectoryTitle: string,
        currentFrame: number,
        currentTime: number,
        timeStep: number,
        onCompleted: () => Promise<void>
    ) {
        this.canvasEl = canvasEl;
        this.trajectoryTitle = trajectoryTitle;
        this.currentFrame = currentFrame;
        this.currentTime = currentTime;
        this.timeStep = timeStep;
        this.onCompleted = onCompleted;
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
        this.finishedRecording = false;
        this.timerId = 0;
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
            const track: MediaStreamVideoTrack = stream.getVideoTracks()[0];
            // MediaStreamTrackProcessor makes the captured stream readable
            this.trackProcessor = new MediaStreamTrackProcessor({ track });
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

    /**
     * Called after the recording has completed or when `abort()` is called.
     */
    protected cleanup(): void {
        clearTimeout(this.timerId);
        this.isRecording = false;
    }

    async startRecordingLoop(): Promise<void> {
        // readFrames in stream recorder used a while loop
        // NM uses startRecordingLoop
        // Reset any existing timers
        clearTimeout(this.timerId);
        // const loadAndRecordFrame
        // if recording
        // check for past max frame
        // try await record frame
        // notify listeners, aka onRecordedFrame
        // define next frame
        // another break condition for if past options max
        // set a timeout for
        const loadAndRecordFrame = async (frame: number): Promise<void> => {
            if (!this.isRecording) {
                return;
            }
            // TODO going to write assuming no looping playback for now, then add that in
            // there are frames and then there are timesteps
            // getNumFrames is a method on all the file readers
            const totalFrames = this.getNumFrames();
            if (frame > getNumFrames() - 1) {
                this.isRecording = false;
                await this.onCompletedRecording();
                return;
            }

            try {
                // TODO track frames via state and call recordFrame with no argument,
                // or get the frame here and pass it in as in NM
                await this.recordFrame(frame);
            } catch (e) {
                console.log("TODO error handling");
                // Report errors but don't stop the recording.
                // if (e instanceof Error) {
                //     this.options.onError(e);
                // } else if (e instanceof ErrorEvent) {
                //     this.options.onError((e as ErrorEvent).error);
                // } else {
                //     // May throw Event type if the error is from an event listener, but without
                //     // information about what error was encountered.
                //     // This happens most often when a resource fails to load
                //     // (e.g., network issues or user not on VPN)
                //     // TODO: Update error message if this tool becomes public!
                //     this.options.onError(
                //         new Error(
                //             "Encountered an unknown error while exporting; this is most likely a network issue. " +
                //                 "See the browser developer console for more details. For Institute users, please check VPN status."
                //         )
                //     );
                // }
            }

            if (!this.isRecording) {
                return;
            }

            // Notify listeners about frame recording
            // In NM this call back is used to show percent complete
            //   onRecordedFrame: (frame: number) => {
            //  // Update the progress bar as frames are recorded.
            //  setPercentComplete(Math.floor(((frame - min) / (max - min)) * 100));
            //  },
            // this.options.onRecordedFrame(frame);

            const nextFrame = frame + 1;
            // this is an option to skip frames in recording in NM, using default of 1 for now
            // TODO decide if this is something to expose as an option or how to handle
            // frame skipping automatically
            // const nextFrame = frame + this.options.frameIncrement;

            if (nextFrame > totalFrames) {
                // Stop recording
                this.finishedRecording = true;
                this.isRecording = false;
                await this.onCompletedRecording();
                this.cleanup();
                //TODO a callback to be passed in, again this is used in NM to handle precentage complete, etc.
                this.onCompleted();
                return;
            }
            this.timerId = window.setTimeout(
                () => loadAndRecordFrame(nextFrame),
                100
                // this.options.delayMs 100 is default in NM, TODO what is the default in simularium
            );
        };
        loadAndRecordFrame(this.currentFrame);
    }

    private async recordFrame(frame: number): Promise<void> {
        // grab canvas at a particular time stamp
        // understand time and frames
        // timestep = 1 second, 60 frames total, 60 seconds total in sim
        // video time 10 seconds, frame 10, current time 10
        // if timestep is 10 seconds, 60 frames total, 600 seconds total in sim
        // video time is 10 seconds, frame 10, current time 100
        // to get "video time" aka elapsed playback, currentTime/timeStep
        // test bed gets currentFrame from timeData in handleTimeChange, should we get from lower level?
        const frameIndex = this.currentFrame;
        const videoTime = this.currentTime / this.timeStep;
        const fps = 60; // per animate() in viewport
        // from NM const frameIndex = Math.floor((frame - this.options.min) / this.options.frameIncrement); // says its to account for frame skipping
        // declare timestamp and duration
        const timestampMicroseconds = (frameIndex / fps) * 1_000_000;
        const durationMicroseconds = 1_000_000 / fps;

        // NM does a delay to let encoder finish processing
        // NM forces re-render to prevent blank frames, this might be more complicated in Simularium
        const newFrame = new VideoFrame(this.canvasEl, {
            timestamp: timestampMicroseconds,
            duration: durationMicroseconds,
        });
        // NM and streamrecorder handle keyframes:
        //                 const keyFrame = this.frameCounter % 150 === 0;
        this.encoder.encode(newFrame, {
            // keyFrame: true,
        });
        newFrame.close();
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
