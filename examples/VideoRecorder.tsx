import React, { useState, useEffect, useRef } from "react";
import Recorder from "../src/simularium/StreamRecorder";
interface VideoRecorderProps {
    trajectoryTitle: string;
}

//TODO: this is a simple component with stop and start
// we should add a number of features: recording status indicator, progress bar, etc.
// also its odd to record the dead time before the simulation starts
// should the behavior be that we click record, 
// and then recording starts and stops when we hit play, pause, or stop?
// We leave this simple and flesh it out in the website, or prototype it here

const VideoRecorder = ({ trajectoryTitle }: VideoRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const recorderRef = useRef<Recorder | null>(null);

    useEffect(() => {
        // Access the existing canvas element
        const canvasEl = document.querySelector("canvas");
        if (canvasEl) {
            recorderRef.current = new Recorder(canvasEl, trajectoryTitle);
        }
    }, [trajectoryTitle]);

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

export default VideoRecorder;
