import React, { useState } from "react";
import { CacheLog } from "@aics/simularium-viewer";

interface StreamingReadoutProps {
    playbackPlayingState: boolean;
    isStreamingState: boolean;
    cacheLog: CacheLog;
    playbackFrame: number;
    streamingHead: number;
}

const TruncatedArrayDisplay: React.FC<{
    array: number[];
    maxDisplayLength?: number;
    separator?: string;
    className?: string;
}> = ({ array, maxDisplayLength = 10, separator = "..." }) => {
    const [showAll, setShowAll] = useState(false);

    if (!array || array.length === 0) {
        return <div>[]</div>;
    }

    if (showAll || array.length <= maxDisplayLength) {
        return (
            <div>
                {array.length > maxDisplayLength && (
                    <button
                    onClick={() => setShowAll(false)}
                    >
                        Show Less
                    </button>
                )}
                <div>{array.join(", ")}</div>
            </div>
        );
    }

    const halfLength = Math.floor(maxDisplayLength / 2);
    const start = array.slice(0, halfLength);
    const end = array.slice(-halfLength);

    return (
        <div>
            <div>
                {start.join(", ")} {separator} {end.join(", ")}
            </div>
            <button onClick={() => setShowAll(true)}>
                Show All {array.length} Frames
            </button>
        </div>
    );
};

const CacheAndStreamingLogsDisplay: React.FC<StreamingReadoutProps> = ({
    playbackPlayingState,
    isStreamingState,
    cacheLog,
    playbackFrame,
    streamingHead,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const {
        size,
        enabled,
        maxSize,
        firstFrameNumber,
        lastFrameNumber,
        framesInCache,
    } = cacheLog;
    return (
        <div className="ui-container">
            <button onClick={() => setIsOpen(!isOpen)}>
                {isOpen
                    ? "Hide Cache and Streaming Info"
                    : "Show Cache and Streaming Info"}
            </button>

            {isOpen && (
                <div className="scroll">
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
                        Frames in Cache:{" "}
                        <TruncatedArrayDisplay
                            array={framesInCache}
                            maxDisplayLength={10}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CacheAndStreamingLogsDisplay;
