import React, { useState } from "react";
import { CacheLog } from "../../../src";

interface StreamingReadoutProps {
    cacheLog: CacheLog;
    playbackFrame: number;
}

const CacheAndStreamingLogsDisplay: React.FC<StreamingReadoutProps> = ({
    cacheLog,
    playbackFrame,
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
                    <div>Cache Size: {size}</div>
                    <div>Cache Enabled: {enabled ? "Yes" : "No"}</div>
                    <div>Max Size: {maxSize}</div>
                    <div>First Frame Number: {firstFrameNumber}</div>
                    <div>Last Frame Number: {lastFrameNumber}</div>
                    <div>Current playback frame: {playbackFrame}</div>
                    <div>
                        Frames in Cache: {framesInCache.join(", ")}
                    </div>
                </>
            )}
        </div>
    );
};

export default CacheAndStreamingLogsDisplay;
