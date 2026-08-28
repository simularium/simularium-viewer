import React from "react";
import { CacheLog } from "../../../type-declarations/simularium";
import {
    PlayIcon,
    PauseIcon,
    StopIcon,
    StepBackIcon,
    StepForwardIcon,
} from "./Icons";

interface TransportBarProps {
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onPrevFrame: () => void;
    onNextFrame: () => void;
    onScrub: (time: number) => void;
    currentTime: number;
    firstFrameTime: number;
    totalDuration: number;
    timeStep: number;
    cacheLog: CacheLog;
    playbackSpeed: number;
    speedPresets: number[];
    onSpeedChange: (speed: number) => void;
    children?: React.ReactNode;
}

const formatTime = (value: number, timeStep: number): string => {
    const decimals =
        timeStep >= 1 ? 0 : timeStep >= 0.1 ? 1 : timeStep >= 0.01 ? 2 : 3;
    return (Number.isFinite(value) ? value : 0).toFixed(decimals);
};

// frame numbers -> contiguous runs, for painting buffered coverage
const cacheRuns = (frames: number[]): Array<[number, number]> => {
    const sorted = [...frames].sort((a, b) => a - b);
    const runs: Array<[number, number]> = [];
    for (const frame of sorted) {
        const last = runs[runs.length - 1];
        if (last && frame === last[1] + 1) {
            last[1] = frame;
        } else {
            runs.push([frame, frame]);
        }
    }
    return runs;
};

const TransportBar = ({
    isPlaying,
    onPlay,
    onPause,
    onStop,
    onPrevFrame,
    onNextFrame,
    onScrub,
    currentTime,
    firstFrameTime,
    totalDuration,
    timeStep,
    cacheLog,
    playbackSpeed,
    speedPresets,
    onSpeedChange,
    children,
}: TransportBarProps): JSX.Element => {
    const duration = totalDuration > 0 ? totalDuration : 0;
    const endTime = firstFrameTime + duration;
    const totalFrames = Math.max(
        1,
        timeStep > 0 ? Math.round(duration / timeStep) + 1 : 1
    );
    const elapsedFraction =
        duration > 0
            ? Math.min(1, Math.max(0, (currentTime - firstFrameTime) / duration))
            : 0;
    const runs = cacheRuns(cacheLog.framesInCache);

    return (
        <div className="transport">
            {children}
            <div className="transport-buttons">
                <button
                    className="icon-btn"
                    onClick={onPrevFrame}
                    title="Previous frame"
                    aria-label="Previous frame"
                >
                    <StepBackIcon />
                </button>
                <button
                    className="play-btn"
                    onClick={isPlaying ? onPause : onPlay}
                    title={isPlaying ? "Pause" : "Play"}
                    aria-label={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button
                    className="icon-btn"
                    onClick={onNextFrame}
                    title="Next frame"
                    aria-label="Next frame"
                >
                    <StepForwardIcon />
                </button>
                <button
                    className="icon-btn"
                    onClick={onStop}
                    title="Stop streaming"
                    aria-label="Stop streaming"
                >
                    <StopIcon />
                </button>
            </div>
            <div className="scrub-wrap">
                <div className="scrub-track">
                    {runs.map(([start, end]) => (
                        <div
                            key={start}
                            className="buffer-segment"
                            style={{
                                left: `${(start / totalFrames) * 100}%`,
                                width: `${
                                    ((end - start + 1) / totalFrames) * 100
                                }%`,
                            }}
                        />
                    ))}
                    <div
                        className="elapsed-fill"
                        style={{ width: `${elapsedFraction * 100}%` }}
                    />
                </div>
                <input
                    className="scrub-input"
                    name="slider"
                    type="range"
                    min={firstFrameTime}
                    max={endTime}
                    step={timeStep > 0 ? timeStep : 1}
                    value={Number.isFinite(currentTime) ? currentTime : 0}
                    onChange={(event) =>
                        onScrub(parseFloat(event.target.value))
                    }
                    aria-label="Scrub time"
                />
            </div>
            <div className="time-readout">
                t {formatTime(currentTime, timeStep)}
                <span className="total"> / {formatTime(endTime, timeStep)}</span>
            </div>
            <select
                className="speed-select"
                value={playbackSpeed}
                onChange={(event) =>
                    onSpeedChange(parseFloat(event.target.value))
                }
                title="Playback speed ( [ slower · ] faster )"
                aria-label="Playback speed"
            >
                {speedPresets.map((speed) => (
                    <option key={speed} value={speed}>
                        {speed}×
                    </option>
                ))}
            </select>
            <div
                className="buffer-readout"
                title="Frames in streaming cache"
            >
                {cacheLog.framesInCache.length}f buffered
            </div>
        </div>
    );
};

export default TransportBar;
