import React, { useCallback, useEffect } from "react";
import { TRAJECTORY_OPTIONS } from "../constants";

interface FileSelectionProps {
    selectedFile: string;
    conversionFileName: string;
    onFileSelect: (file: string) => void;
    loadSmoldynFile: () => void;
    clearFile: () => void;
    loadSmoldynPreConfiguredSim: () => void;
    setRabbitCount: (count: string) => void;
}

const FileSelection = ({
    selectedFile,
    conversionFileName,
    onFileSelect,
    loadSmoldynFile,
    clearFile,
    loadSmoldynPreConfiguredSim,
    setRabbitCount,
}: FileSelectionProps): JSX.Element => {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("file")) {
            const queryStringFile = urlParams.get("file") || "";
            onFileSelect(queryStringFile);
        }
    }, []);

    const isAwaitingFileConversion = conversionFileName !== "";
    const selectValue = isAwaitingFileConversion
        ? "Awaiting file conversion..."
        : selectedFile;

    const handleFileSelect = useCallback(
        (file: string) => {
            if (conversionFileName !== "") {
                return;
            }
            onFileSelect(file);
        },
        [selectedFile, onFileSelect, conversionFileName]
    );

    const notInList =
        selectedFile && !TRAJECTORY_OPTIONS.some((t) => t.id === selectedFile);

    return (
        <div className={"ui-container"}>
            <select
                value={selectValue}
                onChange={(e) => handleFileSelect(e.target.value as string)}
                style={{ maxWidth: 200 }}
                disabled={isAwaitingFileConversion}
            >
                <option value="" disabled>
                    choose a file
                </option>
                {isAwaitingFileConversion && (
                    <option value={"Awaiting file conversion..."} disabled>
                        Awaiting file conversion...
                    </option>
                )}
                {Object.values(TRAJECTORY_OPTIONS).map((traj) => (
                    <option key={traj.id} value={traj.id}>
                        {traj.name}
                    </option>
                ))}
                {notInList && (
                    <option value={selectedFile}>{selectedFile}</option>
                )}
            </select>
            <br></br>
            <button onClick={() => clearFile()}>Clear trajectory </button>
            <button onClick={loadSmoldynFile}>
                Convert a smoldyn trajectory
            </button>
            <div className="ui-container">
                <button onClick={loadSmoldynPreConfiguredSim}>
                    Run pre-config Smoldyn sim via BioSimulators API
                </button>
                <label>
                    Initial Rabbit Count:
                    <input
                        defaultValue="100"
                        onChange={(event) => {
                            setRabbitCount(event.target.value);
                        }}
                    />
                </label>
            </div>
        </div>
    );
};

export default FileSelection;
