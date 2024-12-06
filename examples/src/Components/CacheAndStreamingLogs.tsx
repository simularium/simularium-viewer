import React, { useState } from "react";
import { CacheLog } from "../../../src";

interface StreamingReadoutProps {
    playbackState: string;
    streamingState: string;
    cacheLog: CacheLog;
    totalDuration: number;
}

const CacheAndStreamingLogs: React.FC<StreamingReadoutProps> = ({
    playbackState,
    streamingState,
    cacheLog,
    totalDuration,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const {
        size,
        enabled,
        maxSize,
        firstFrameNumber,
        lastFrameNumber,
    } = cacheLog;
    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)}>
                {isOpen
                    ? "Hide Cache and Streaming Info"
                    : "Show Cache and Streaming Info"}
            </button>

            {isOpen && (
                <>
                    <div>Playback State: {playbackState}</div>
                    <div>Streaming State: {streamingState}</div>
                    <div>Cache Size: {size}</div>
                    <div>Cache Enabled: {enabled ? "Yes" : "No"}</div>
                    <div>Max Size: {maxSize}</div>
                    <div>
                        First Frame Number: {firstFrameNumber}
                    </div>
                    <div>Last Frame Number: {lastFrameNumber}</div>
                    <div>Total Duration: {totalDuration}</div>
                </>
            )}
        </div>
    );
};

export default CacheAndStreamingLogs;
