import { set } from "lodash";
import React, { useState, useEffect } from "react";

interface RecordMovieComponentProps {
    startRecordingHandler: () => void;
    stopRecordingHandler: () => void;
}

const RecordMovieComponent = ({
    startRecordingHandler,
    stopRecordingHandler,
}: RecordMovieComponentProps): JSX.Element => {
    // recording time measured in seconds
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordingStartTime, setRecordingStartTime] = useState<number>(-1);

    const browserSupported = "VideoEncoder" in window;

    // this useEffect is a timer that updates the recording duration
    useEffect(() => {
        let intervalId;
        if (isRecording) {
            setRecordingStartTime(Date.now());
            startRecordingHandler();
        } else {
            setRecordingStartTime(0);
            stopRecordingHandler();
        }
        return () => {
            clearInterval(intervalId);
        };
    }, [isRecording]);



    return (
        <div>
            <button
                onClick={() => setIsRecording(true)}
                disabled={isRecording || !browserSupported}
            >
                Start Recording
            </button>
            <button
                onClick={() => setIsRecording(false)}
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
                    ? `Recording duration:  ${
                          Date.now() - recordingStartTime
                      } seconds`
                    : ""}
            </div>
            <div>{recordingStartTime === 0 ? "Recording complete" : ""}</div>
        </div>
    );
};

export default RecordMovieComponent;
