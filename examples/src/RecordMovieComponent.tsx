import React, { useState, useEffect, useRef } from "react";

interface RecordMovieComponentProps {
    isRecording: boolean;
    setIsRecording: (isRecording: boolean) => void;
}

const RecordMovieComponent = ({
    isRecording,
    setIsRecording,
}: RecordMovieComponentProps) => {
    let [recordingDuration, setRecordingDuration] = useState<number>(0);
    let [recordingStatus, setRecordingStatus] =
        useState<string>("Not recording");
    let [outputStatus, setOutputStatus] = useState<string>("");

    // this useEffect is a timer that updates the recording duration
    useEffect(() => {
        let intervalId;
        if (isRecording) {
            intervalId = setInterval(() => {
                setRecordingDuration((prevTimer) => prevTimer + 1);
            }, 1000);
        }
        return () => {
            clearInterval(intervalId);
        };
    }, [isRecording]);

    const startRecording = async () => {
        setRecordingStatus("Recording...");
        setOutputStatus("");
        setIsRecording(true);
    };

    const stopRecording = () => {
        setRecordingStatus("Not recording");
        setOutputStatus("Recording complete");
        setIsRecording(false);
        setRecordingDuration(0);
    };

    return (
        <div>
            <button onClick={startRecording} disabled={isRecording}>
                Start Recording
            </button>
            <button onClick={stopRecording} disabled={!isRecording}>
                Stop Recording
            </button>
            <div>{recordingStatus}</div>
            <div>
                {isRecording
                    ? "Recording duration:  " + recordingDuration + " seconds"
                    : ""}
            </div>
            <div>{outputStatus}</div>
        </div>
    );
};

export default RecordMovieComponent;
