import React from "react";
import { PLAYBACK_SPEEDS } from "@aics/simularium-viewer";

interface SpeedControlProps {
    setSpeed: (speed: number) => void;
    currentSpeed: number;
}

const SpeedControl: React.FC<SpeedControlProps> = ({
    setSpeed,
    currentSpeed,
}) => {
    return (
        <div>
            Playback Speeds
            {PLAYBACK_SPEEDS.map((speedIndex) => (
                <button
                    key={speedIndex}
                    onClick={() =>
                        setSpeed(PLAYBACK_SPEEDS.indexOf(speedIndex))
                    }
                    className={`${
                        currentSpeed === speedIndex ? "speed-button-active" : ""
                    }`}
                >
                    {speedIndex}
                </button>
            ))}
        </div>
    );
};

export default SpeedControl;