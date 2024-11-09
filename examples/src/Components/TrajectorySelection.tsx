import { set } from "lodash";
import React from "react";

interface PlaybackOption {
    value: string;
    label: string;
}

interface TrajectorySelectionComponentProps {
    simulariumController: {
        pause: () => void;
        clearFile: () => void;
    };
    playbackFile: string;
    queryStringFile: string;
    PLAYBACK_OPTIONS: PlaybackOption[];
    configureAndLoad: () => void;
    translateAgent: () => void;
    loadSmoldynFile: () => void;
    setplaybackFile: (file: string) => void;
}

const TrajectorySelection: React.FC<TrajectorySelectionComponentProps> = ({
    simulariumController,
    playbackFile,
    queryStringFile,
    PLAYBACK_OPTIONS,
    configureAndLoad,
    translateAgent,
    loadSmoldynFile,
    setplaybackFile,
}) => {
    const handleSelectChange = (
        event: React.ChangeEvent<HTMLSelectElement>
    ) => {
        simulariumController.pause();
        setplaybackFile(event.target.value);
        configureAndLoad();
    };

    return (
        <div className="ui-container">
            <select onChange={handleSelectChange} defaultValue={playbackFile}>
                <option value={queryStringFile}>{queryStringFile}</option>
                {PLAYBACK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <button onClick={translateAgent}>Translate Agent</button>
            <button onClick={() => simulariumController.clearFile()}>
                Clear
            </button>
            <button onClick={loadSmoldynFile}>Load a Smoldyn trajectory</button>
        </div>
    );
};

export default TrajectorySelection;
