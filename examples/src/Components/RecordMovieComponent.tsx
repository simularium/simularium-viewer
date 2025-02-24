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
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordingTimeElapsed, setRecordingTimeElapsed] = useState<number>(0);
    const [outputStatus, setOutputStatus] = useState<string>("");

    const browserSupported = "VideoEncoder" in window;

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
            {isRecordingEnabled && (
                <>
                    <button
                        onClick={startRecording}
                        disabled={isRecording || !browserSupported}
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
                    {!browserSupported && (
                        <div>Browser does not support recording</div>
                    )}
                    <div>
                        {isRecording
                            ? "Recording duration:  " +
                              recordingTimeElapsed +
                              " seconds"
                            : ""}
                    </div>
                    <div>{outputStatus}</div>
                </>
            )}
        </div>
    );
};

export default RecordMovieComponent;
