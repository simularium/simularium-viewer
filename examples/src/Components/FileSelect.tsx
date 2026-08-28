import React, { useCallback, useEffect } from "react";
import { TRAJECTORY_OPTIONS } from "../constants";
import { ClearIcon, UploadIcon } from "./Icons";

interface FileSelectionProps {
    selectedFile: string;
    conversionFileName: string;
    onFileSelect: (file: string) => void;
    loadSmoldynFile: () => void;
    clearFile: () => void;
}

// header trajectory picker; supports ?file=<id or url> in the query string
const FileSelection = ({
    selectedFile,
    conversionFileName,
    onFileSelect,
    loadSmoldynFile,
    clearFile,
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
        <div className="trajectory-picker">
            <span className="picker-label">Trajectory</span>
            <select
                value={selectValue}
                onChange={(e) => handleFileSelect(e.target.value as string)}
                style={{ maxWidth: 260 }}
                disabled={isAwaitingFileConversion}
                aria-label="Choose a trajectory"
            >
                <option value="" disabled>
                    Choose a trajectory
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
            <button
                className="ghost icon-btn"
                onClick={() => clearFile()}
                title="Clear trajectory"
                aria-label="Clear trajectory"
            >
                <ClearIcon />
            </button>
            <button onClick={loadSmoldynFile} title="Convert a Smoldyn output file via the remote conversion service">
                <UploadIcon />
                Convert Smoldyn file
            </button>
        </div>
    );
};

export default FileSelection;
