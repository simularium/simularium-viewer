import React, { useState, useEffect } from "react";

interface RecordMovieComponentProps {
    startRecordingHandler: () => void;
    stopRecordingHandler: () => void;
    setRecordingEnabled: () => void;
    isRecordingEnabled: boolean;
}

const formatElapsed = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

const RecordMovieComponent = ({
    startRecordingHandler,
    stopRecordingHandler,
    setRecordingEnabled,
    isRecordingEnabled,
}: RecordMovieComponentProps): JSX.Element => {
    // recording time measured in seconds
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordingTimeElapsed, setRecordingTimeElapsed] = useState<number>(0);
    const [outputStatus, setOutputStatus] = useState<string>("");

    const browserSupported = "VideoEncoder" in window;

    // this useEffect is a timer that updates the recording duration
    useEffect(() => {
        let intervalId;
        if (isRecording) {
            intervalId = setInterval(() => {
                setRecordingTimeElapsed((prevTimer) => prevTimer + 1);
            }, 1000);
        }
        return () => {
            clearInterval(intervalId);
        };
    }, [isRecording]);

    const startRecording = async () => {
        setOutputStatus("");
        setIsRecording(true);
        startRecordingHandler();
    };

    const stopRecording = () => {
        setOutputStatus("Saved to downloads as .mp4");
        setIsRecording(false);
        setRecordingTimeElapsed(0);
        stopRecordingHandler();
    };

    if (!browserSupported) {
        return (
            <div className="note">
                This browser can&apos;t encode video (no VideoEncoder API).
            </div>
        );
    }

    return (
        <>
            <div className="switch-row">
                <span className="switch-label">Capture enabled</span>
                <button
                    className={`switch${isRecordingEnabled ? " on" : ""}`}
                    onClick={() => setRecordingEnabled()}
                    role="switch"
                    aria-checked={isRecordingEnabled}
                    aria-label="Enable recording"
                />
            </div>
            <div className="row">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        disabled={!isRecordingEnabled}
                    >
                        Start recording
                    </button>
                ) : (
                    <button onClick={stopRecording}>
                        <span className="rec-dot" />
                        Stop &amp; save
                    </button>
                )}
                {isRecording && (
                    <span className="readout">
                        <span className="v accent">
                            {formatElapsed(recordingTimeElapsed)}
                        </span>
                    </span>
                )}
            </div>
            {outputStatus && <div className="note">{outputStatus}</div>}
        </>
    );
};

export default RecordMovieComponent;
