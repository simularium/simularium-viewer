import React from "react";
import { PLAYBACK_SPEEDS } from "../constants";

interface PlaybackControlsProps {
    simulariumController: any;
    totalSteps: number;
    timeStep: number;
    currentFrame: number;
    setSpeed: (speed: number) => void;
    currentSpeed: number;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    simulariumController,
    totalSteps,
    timeStep,
    currentFrame,
    setSpeed,
    currentSpeed,
}) => {
    return (
        <div className="ui-container">
            <div>
                <button onClick={() => simulariumController.resume()}>
                    Play / Resume
                </button>
                <button onClick={() => simulariumController.pause()}>
                    Pause
                </button>
                <button onClick={() => simulariumController.stop()}>
                    Stop
                </button>
                <button
                    onClick={() =>
                        simulariumController.movePlaybackFrame(currentFrame - 1)
                    }
                >
                    Previous Frame
                </button>
                <button
                    onClick={() =>
                        simulariumController.movePlaybackFrame(currentFrame + 1)
                    }
                >
                    Next Frame
                </button>
            </div>

            <div>
                <input
                    name="slider"
                    type="range"
                    min={0}
                    step={1}
                    value={currentFrame}
                    max={totalSteps}
                    onChange={(event) =>
                        simulariumController.movePlaybackFrame(
                            parseInt(event.target.value)
                        )
                    }
                />
                <label htmlFor="slider">
                    {currentFrame * timeStep} /{" "}
                    {totalSteps * timeStep}
                </label>
            </div>

            <div>
                Playback Speeds
                {PLAYBACK_SPEEDS.map((speed, speedIndex) => (
                    <button
                        key={speed}
                        onClick={() => setSpeed(PLAYBACK_SPEEDS[speedIndex])}
                        className={`${
                            currentSpeed === speed ? "speed-button-active" : ""
                        }`}
                    >
                        {speed}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PlaybackControls;
