import React, { useState, useEffect, useRef } from "react";

interface RecordMovieComponentProps {
    isRecording: boolean;
    setIsRecording: (isRecording: boolean) => void;
    isRecordingEnabled: boolean;
}

const RecordMovieComponent = ({
    isRecording,
    setIsRecording,
    isRecordingEnabled,
}: RecordMovieComponentProps) => {
    // recording time measured in seconds
    let [recordingTimeElapsed, setRecordingTimeElapsed] = useState<number>(0);
    let [outputStatus, setOutputStatus] = useState<string>("");

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
    };

    const stopRecording = () => {
        setOutputStatus("Recording complete");
        setIsRecording(false);
        setRecordingTimeElapsed(0);
    };

    return (
        <div>
            <button
                onClick={startRecording}
                disabled={
                    !isRecordingEnabled || isRecording || !browserSupported
                }
            >
                Start Recording
            </button>
            <button
                onClick={stopRecording}
                disabled={
                    !isRecordingEnabled || !isRecording || !browserSupported
                }
            >
                Stop Recording
            </button>
            <div>{isRecording ? "Recording..." : ""}</div>
            <div>
                {" "}
                {!browserSupported
                    ? "Browser does not support recording"
                    : ""}{" "}
                {!isRecordingEnabled
                    ? "Recording is not enabled, provide a callback to enable feature"
                    : ""}
            </div>
            <div>
                {isRecording
                    ? "Recording duration:  " +
                      recordingTimeElapsed +
                      " seconds"
                    : ""}
            </div>
            <div>{outputStatus}</div>
        </div>
    );
};

export default RecordMovieComponent;
