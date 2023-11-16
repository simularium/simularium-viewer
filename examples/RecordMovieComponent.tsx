import React, { useState, useEffect, useRef } from "react";
import Recorder from "../src/simularium/StreamRecorder";

interface RecordMovieComponentProps {
    trajectoryTitle: string;
}

const RecordMovieComponent = ({
    trajectoryTitle,
}: RecordMovieComponentProps) => {
    const [isRecording, setIsRecording] = useState(false);
    let [recordingDuration, setRecordingDuration] = useState<number>(0);
    let [recordingStatus, setRecordingStatus] =
        useState<string>("Not recording");
    let [outputStatus, setOutputStatus] = useState<string>("");
    const recorderRef = useRef<Recorder | null>(null);

    useEffect(() => {
        // Access the existing canvas element
        const canvasEl = document.querySelector("canvas");
        if (canvasEl) {
            recorderRef.current = new Recorder(canvasEl, trajectoryTitle);
        }
    }, [trajectoryTitle]);

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
        if (recorderRef.current) {
            await recorderRef.current.setupStream();
            setRecordingDuration(0);
            setIsRecording(true);
            setRecordingStatus("Recording in progress...");
            setOutputStatus("");
        }
    };

    const stopRecording = async () => {
        // when we start recording again, reset ouput status to recording in progress
        if (recorderRef.current) {
            setIsRecording(false);
            setRecordingStatus("Not recording");
            setOutputStatus("Processing...");
            await recorderRef.current.onCompletedRecording();
            setOutputStatus(
                "Your movie has been downloaded, duration: " +
                    recordingDuration +
                    " seconds"
            );
        }
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
