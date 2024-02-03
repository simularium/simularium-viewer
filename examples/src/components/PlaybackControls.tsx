import React from "react";
import { SimulariumController } from "../../../src";

interface PlaybackControlProps {
    controller: SimulariumController;
    timeStep: number;
    currentTime: number;
    totalDuration: number;
}

const PlaybackControls = (props: PlaybackControlProps): JSX.Element => {
    const { controller, timeStep, currentTime, totalDuration } = props;

    const gotoPreviousFrame = (): void => {
        controller.gotoTime(currentTime - timeStep);
    };

    const goToNextFrame = (): void => {
        controller.gotoTime(currentTime + timeStep);
    };

    const handleScrubTime = (event): void => {
        controller.gotoTime(parseFloat(event.target.value));
    };

    return (
        <>
            <button onClick={() => controller.resume()}>Play</button>
            <button onClick={() => controller.pause()}>Pause</button>
            <button onClick={() => controller.stop()}>stop</button>
            <button onClick={gotoPreviousFrame}>Previous Frame</button>
            <button onClick={goToNextFrame}>Next Frame</button>
            <input
                name="slider"
                type="range"
                min={0}
                step={timeStep}
                value={currentTime}
                max={totalDuration}
                onChange={handleScrubTime}
            />
            <label htmlFor="slider">
                {currentTime} / {totalDuration}
            </label>
        </>
    );
};

export default PlaybackControls;
