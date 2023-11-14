import React, { useState, useEffect, useRef } from "react";
import Recorder from "../src/recorders/StreamRecorder"; // Adjust the import path as necessary

const VideoRecorderComponent = () => {
    const [isRecording, setIsRecording] = useState(false);
    const recorderRef = useRef<Recorder | null>(null);

    useEffect(() => {
        // Access the existing canvas element
        const canvasEl = document.querySelector("canvas");
        if (canvasEl) {
            recorderRef.current = new Recorder(canvasEl);
        }
    }, []);

    const startRecording = async () => {
        if (recorderRef.current) {
            await recorderRef.current.setupStream();
            setIsRecording(true);
        }
    };

    const stopRecording = async () => {
        if (recorderRef.current) {
            await recorderRef.current.onCompletedRecording();
            setIsRecording(false);
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
        </div>
    );
};

export default VideoRecorderComponent;
