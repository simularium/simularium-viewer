import React, { useEffect, useState } from "react";

interface StreamingReadoutProps {
    playbackState: string;
    streamingState: string;
    cacheSize: number;
    cacheEnabled: boolean;
    maxSize: number;
    firstFrameNumber: number;
    lastFrameNumber: number;
    currentPlaybackFrame: number;
    totalDuration: number;
    getFirstFrameNumber: () => number;
    getLastFrameNumber: () => number;
}

const CacheAndStreamingLogs: React.FC<StreamingReadoutProps> = ({
    playbackState,
    streamingState,
    cacheSize,
    cacheEnabled,
    maxSize,
    firstFrameNumber,
    lastFrameNumber,
    currentPlaybackFrame,
    totalDuration,
    getFirstFrameNumber,
    getLastFrameNumber,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [debugInfo, setDebugInfo] = useState({
        directFirst: -1,
        functionFirst: -1,
        renderCount: 0,
    });

    useEffect(() => {
        setDebugInfo((prev) => ({
            directFirst: firstFrameNumber,
            functionFirst: getFirstFrameNumber(),
            renderCount: prev.renderCount + 1,
        }));
    }, [firstFrameNumber, getFirstFrameNumber, lastFrameNumber]);

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? "Hide Cache and Streaming Info" : "Show Cache and Streaming Info"}
            </button>

            {isOpen && (
                <>
                    <div>Playback State: {playbackState}</div>
                    <div>Streaming State: {streamingState}</div>
                    <div>Cache Size: {cacheSize}</div>
                    <div>Cache Enabled: {cacheEnabled ? "Yes" : "No"}</div>
                    <div>Max Size: {maxSize}</div>
                    <div>First Frame Number: {getFirstFrameNumber()} this is buggy and shows a stale value even when i can log a different value with hasFrames()</div>
                    <div>Last Frame Number: {getLastFrameNumber()}</div>
                    <div>Total Duration: {totalDuration}</div>
                    <div className="debug-info">
                        <div className="debug-header">Debug Info:</div>
                        <div className="debug-item">
                            Render Count: {debugInfo.renderCount}
                        </div>
                        <div className="debug-item">
                            Direct First Frame: {debugInfo.directFirst}
                        </div>
                        <div className="debug-item">
                            Function First Frame: {debugInfo.functionFirst}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CacheAndStreamingLogs;
