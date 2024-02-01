import React, { useState, useEffect, useRef } from "react";
import FrameRecorder from "../../src/simularium/FrameRecorder";

interface RecordMovieComponentProps {
    trajectoryTitle: string;
    currentFrame: number;
    currentTime: number;
    timeStep: number;
}

const RecordMovieComponent = ({
    trajectoryTitle,
    currentFrame,
    currentTime,
    timeStep,
}: RecordMovieComponentProps) => {
    const recorderRef = useRef<FrameRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    let [recordingDuration, setRecordingDuration] = useState<number>(0);
    let [recordingStatus, setRecordingStatus] =
        useState<string>("Not recording");
    let [outputStatus, setOutputStatus] = useState<string>("");

    useEffect(() => {
        // Access the existing canvas element
        const canvasEl = document.querySelector("canvas");
        if (canvasEl) {
            recorderRef.current = new FrameRecorder(canvasEl, trajectoryTitle, currentFrame, currentTime, timeStep);
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
