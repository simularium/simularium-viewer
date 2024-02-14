import React, { useState, useEffect, useRef } from "react";

interface RecordMovieComponentProps {
    isRecording: boolean;
    setIsRecording: (isRecording: boolean) => void;
}

const RecordMovieComponent = ({
    isRecording,
    setIsRecording,
}: RecordMovieComponentProps) => {
    let [recordingTimeElapsed, setRecordingTimeElapsed] = useState<number>(0);
    let [outputStatus, setOutputStatus] = useState<string>("");

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
        if ("VideoEncoder" in window) {
        setOutputStatus("");
        setIsRecording(true);}
        else alert("VideoEncoder not supported in this browser")
    };

    const stopRecording = () => {
        setOutputStatus("Recording complete");
        setIsRecording(false);
        setRecordingTimeElapsed(0);
    };

    return (
        <div>
            <button onClick={startRecording} disabled={isRecording}>
                Start Recording
            </button>
            <button onClick={stopRecording} disabled={!isRecording}>
                Stop Recording
            </button>
            <div>{isRecording ? "Recording..." : ""}</div>
            <div>
                {isRecording
                    ? "Recording duration:  " + recordingTimeElapsed + " seconds"
                    : ""}
            </div>
            <div>{outputStatus}</div>
        </div>
    );
};

export default RecordMovieComponent;
