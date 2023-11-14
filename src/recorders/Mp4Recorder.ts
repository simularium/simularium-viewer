import { ArrayBufferTarget, Muxer } from "mp4-muxer";

import CanvasRecorder, {
    RecordingOptions,
    defaultRecordingOptions,
} from "./CanvasRecorder";
// import { sleep } from "../utils/timing_utils";

const sleep = async function (timeoutMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, timeoutMs));
};

// Eslint doesn't recognize the WebCodecs API yet.
// This line prevents eslint from throwing errors like
// 'VideoEncoder' is not defined (no-undef).
/* global VideoEncoder, VideoFrame, VideoEncoderConfig*/

export enum VideoBitrate {
    HIGH = 1e8, // 100 Mbps
    MEDIUM = 1e7, // 10 Mbps
    LOW = 5e6, // 5 Mbps
}

/**
 * Records frames to an MP4 file using the WebCodecs API.
 *
 * Note that the VideoCodecs API is unavailable in some browsers, including Firefox,
 * as of 10/2/2023.
 */
export default class Mp4VideoRecorder extends CanvasRecorder {
    private videoEncoder: VideoEncoder;
    // Muxer is optional here because it depends on an async process.
    private muxer?: Muxer<ArrayBufferTarget>;

    constructor(
        // setFrameAndRender: (frame: number) => Promise<void>,
        setFrameAndRender: (frame: number) => number,
        getCanvas: () => HTMLCanvasElement,
        options: Partial<RecordingOptions>
    ) {
        super(setFrameAndRender, getCanvas);

        this.options = { ...defaultRecordingOptions, ...options };
        this.videoEncoder = new VideoEncoder({
            output: (chunk, meta) => this.muxer?.addVideoChunk(chunk, meta),
            error: (e: Error) => console.error(e),
        });
    }

    protected async setup(): Promise<void> {
        // Check for supported configs!
        // See https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder/isConfigSupported_static
        // for a detailed example.
        const width = this.options.outputSize[0];
        const height = this.options.outputSize[1];
        const bitrate = this.options.bitrate;
        // Note: Only avc is recognized by Windows Media player by default. The other codec formats
        // can be played if plugins are downloaded. AVC is set to be the default here, with fallbacks
        // just in case.

        // first value is browser-recognized codec, second value is muxer codec name
        const codecs: [string, "avc" | "vp9" | "av1"][] = [
            ["avc1.420028", "avc"],
            ["vp09.00.10.08", "vp9"],
            ["av01.0.04M.08", "av1"],
        ];
        const accelerations: ("prefer-hardware" | "prefer-software")[] = [
            "prefer-hardware",
            "prefer-software",
        ];

        for (const [codec, muxerCodec] of codecs) {
            for (const acceleration of accelerations) {
                const config: VideoEncoderConfig = {
                    codec: codec,
                    hardwareAcceleration: acceleration,
                    width,
                    height,
                    bitrate,
                    bitrateMode: "constant",
                    framerate: this.options.fps,
                };
                // This process needs to be in await because VideoEncoder.isConfigSupported is async.
                const { supported, config: supportedConfig } =
                    await VideoEncoder.isConfigSupported(config);
                if (supported && supportedConfig) {
                    this.videoEncoder.configure(supportedConfig);
                    this.muxer = new Muxer({
                        target: new ArrayBufferTarget(),
                        video: {
                            codec: muxerCodec,
                            width: width,
                            height: height,
                        },
                    });
                    return;
                }
            }
        }

        throw new Error("No valid configuration found for the video encoder.");
    }

    protected async recordFrame(frame: number): Promise<void> {
        // Account for frame skipping
        const frameIndex = Math.floor(
            (frame - this.options.min) / this.options.frameIncrement
        );
        // SIM TODO add this back to support fps options
        // const fps = this.options.fps;
        const fps = 30;

        // Video compression works by recording changes from one frame to the next. Keyframes
        // have the full frame data saved, so adding them in ensures a smaller drop in frame
        // quality. See https://en.wikipedia.org/wiki/Key_frame for more details.
        // Add a keyframe every second. (1-2 seconds usually recommended)
        const keyFrame = frameIndex % fps === 0;
        // 1 second = 1,000,000 microseconds
        const timestampMicroseconds = (frameIndex / fps) * 1_000_000;
        const durationMicroseconds = 1_000_000 / fps;

        // Delay if needed so video encoder can finish processing.
        // See https://developer.chrome.com/articles/webcodecs/#encoding
        while (this.videoEncoder.encodeQueueSize > 2) {
            await sleep(10);
        }

        if (!this.isRecording()) {
            return;
        }

        // Force a re-render just before recording to prevent blank frames.
        //SIM TODO commented  because we dont want to be setting frames in sim
        // await this.setFrameAndRender(frame);
        // Add the frame to the video encoder
        // console.log("durationMicroseconds", durationMicroseconds)
        // console.log("timestampMicroseconds", timestampMicroseconds)
        // console.log("keyFrame", keyFrame)
        console.log("frame", frame);
        // const videoFrame = new VideoFrame(this.getCanvas(), {
        //     duration: durationMicroseconds,
        //     timestamp: timestampMicroseconds,
        // });
        const videoFrame = new VideoFrame(this.getCanvas(), {
            timestamp: frame,
        });
        console.log("videoFrame", videoFrame);
        this.videoEncoder.encode(videoFrame, {
            keyFrame,
        });
        videoFrame.close();
    }

    protected async onCompletedRecording(): Promise<void> {
        await this.videoEncoder.flush();
        if (!this.muxer) {
            this.options.onError(
                new Error(
                    "No muxer found to convert video. Something may have gone wrong internally during export setup."
                )
            );
            return;
        }

        this.muxer.finalize();
        const { buffer } = this.muxer.target;

        // Download the finished video file
        const videoBlob = new Blob([buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(videoBlob);
        this.download(this.options.prefix + ".mp4", url);
        URL.revokeObjectURL(url);
    }

    protected cleanup(): void {}

    public static isSupported(): boolean {
        // Check if WebCodecs API exists
        return typeof VideoEncoder === "function";
    }
}
