import React, { useState, useEffect } from "react";

interface RecordMovieComponentProps {
    startRecordingHandler: () => void;
    stopRecordingHandler: () => void;
    setRecordingEnabled: () => void;
    isRecordingEnabled: boolean;
}

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
        setOutputStatus("Recording complete");
        setIsRecording(false);
        setRecordingTimeElapsed(0);
        stopRecordingHandler();
    };

    return (
        <div className="ui-container">
            <button onClick={() => setRecordingEnabled()}>
                {isRecordingEnabled ? "Disable" : "Enable"} Recording
            </button>
            <button
                onClick={startRecording}
                disabled={
                    isRecording || !browserSupported || !isRecordingEnabled
                }
            >
                Start Recording
            </button>
            <button
                onClick={stopRecording}
                disabled={!isRecording || !browserSupported}
            >
                Stop Recording
            </button>
            <div>{isRecording ? "Recording..." : ""}</div>
            <div>
                {!browserSupported ? "Browser does not support recording" : ""}
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
