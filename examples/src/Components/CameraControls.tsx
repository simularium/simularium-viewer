import React from "react";
import {
    ZoomInIcon,
    ZoomOutIcon,
    ResetCamIcon,
    CenterIcon,
    OrientIcon,
    PanIcon,
    OrbitIcon,
    OrthoIcon,
    FocusIcon,
} from "./Icons";

interface CameraControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetCamera: () => void;
    onCenterCamera: () => void;
    onReOrientCamera: () => void;
    panMode: boolean;
    onTogglePan: () => void;
    focusMode: boolean;
    onToggleFocus: () => void;
    orthoMode: boolean;
    onToggleOrtho: () => void;
}

// floating cluster overlaid bottom-right of the viewport
const CameraControls = ({
    onZoomIn,
    onZoomOut,
    onResetCamera,
    onCenterCamera,
    onReOrientCamera,
    panMode,
    onTogglePan,
    focusMode,
    onToggleFocus,
    orthoMode,
    onToggleOrtho,
}: CameraControlsProps): JSX.Element => (
    <div className="camera-cluster">
        <div className="camera-group">
            <button
                className={`icon-btn${panMode ? " on" : ""}`}
                onClick={onTogglePan}
                title={panMode ? "Drag pans — click to orbit" : "Drag orbits — click to pan"}
                aria-label="Toggle pan / orbit"
            >
                {panMode ? <PanIcon /> : <OrbitIcon />}
            </button>
            <button
                className={`icon-btn${focusMode ? " on" : ""}`}
                onClick={onToggleFocus}
                title="Focus mode"
                aria-label="Toggle focus mode"
            >
                <FocusIcon />
            </button>
            <button
                className={`icon-btn${orthoMode ? " on" : ""}`}
                onClick={onToggleOrtho}
                title={orthoMode ? "Orthographic — click for perspective" : "Perspective — click for orthographic"}
                aria-label="Toggle camera projection"
            >
                <OrthoIcon />
            </button>
        </div>
        <div className="camera-group">
            <button
                className="icon-btn"
                onClick={onZoomIn}
                title="Zoom in"
                aria-label="Zoom in"
            >
                <ZoomInIcon />
            </button>
            <button
                className="icon-btn"
                onClick={onZoomOut}
                title="Zoom out"
                aria-label="Zoom out"
            >
                <ZoomOutIcon />
            </button>
            <button
                className="icon-btn"
                onClick={onCenterCamera}
                title="Center camera"
                aria-label="Center camera"
            >
                <CenterIcon />
            </button>
            <button
                className="icon-btn"
                onClick={onReOrientCamera}
                title="Starting orientation"
                aria-label="Starting orientation"
            >
                <OrientIcon />
            </button>
            <button
                className="icon-btn"
                onClick={onResetCamera}
                title="Reset camera"
                aria-label="Reset camera"
            >
                <ResetCamIcon />
            </button>
        </div>
    </div>
);

export default CameraControls;
