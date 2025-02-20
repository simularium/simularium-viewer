import React, { useState } from "react";
import { CacheLog } from "../../../src";

interface StreamingReadoutProps {
    playbackPlayingState: boolean;
    isStreamingState: boolean;
    cacheLog: CacheLog;
    playbackFrame: number;
    streamingHead: number;
}

const CacheAndStreamingLogsDisplay: React.FC<StreamingReadoutProps> = ({
    playbackPlayingState,
    isStreamingState,
    cacheLog,
    playbackFrame,
    streamingHead,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const { size, enabled, maxSize, firstFrameNumber, lastFrameNumber, framesInCache } =
        cacheLog;
    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)}>
                {isOpen
                    ? "Hide Cache and Streaming Info"
                    : "Show Cache and Streaming Info"}
            </button>

            {isOpen && (
                <>
                    <div>
                        Playback State:{" "}
                        {playbackPlayingState === true ? "playing" : "paused"}
                    </div>
                    <div>
                        Streaming State:{" "}
                        {isStreamingState == true
                            ? "streaming"
                            : "not streaming"}
                    </div>
                    <div>Cache Size: {size}</div>
                    <div>Cache Enabled: {enabled ? "Yes" : "No"}</div>
                    <div>Max Size: {maxSize}</div>
                    <div>First Frame Number: {firstFrameNumber}</div>
                    <div>Last Frame Number: {lastFrameNumber}</div>
                    <div>Current playback frame: {playbackFrame}</div>
                    <div>Current streaming head: {streamingHead}</div>
                    <div>
                        Frames in Cache: {framesInCache.join(", ")}
                    </div>
                </>
            )}
        </div>
    );
};

export default CacheAndStreamingLogsDisplay;
