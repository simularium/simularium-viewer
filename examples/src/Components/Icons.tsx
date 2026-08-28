import React from "react";

// 16px stroke icon set, inherits currentColor
const base = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

export const PlayIcon = (): JSX.Element => (
    <svg {...base} fill="currentColor" stroke="none">
        <path d="M5 3.2v9.6c0 .5.55.8.98.53l7.1-4.8a.63.63 0 0 0 0-1.06l-7.1-4.8A.63.63 0 0 0 5 3.2Z" />
    </svg>
);

export const PauseIcon = (): JSX.Element => (
    <svg {...base} fill="currentColor" stroke="none">
        <rect x="4" y="3" width="3" height="10" rx="1" />
        <rect x="9" y="3" width="3" height="10" rx="1" />
    </svg>
);

export const StopIcon = (): JSX.Element => (
    <svg {...base} fill="currentColor" stroke="none">
        <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
    </svg>
);

export const StepBackIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M11.5 3.5 6 8l5.5 4.5" />
        <path d="M4.5 3.5v9" />
    </svg>
);

export const StepForwardIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M4.5 3.5 10 8l-5.5 4.5" />
        <path d="M11.5 3.5v9" />
    </svg>
);

export const ZoomInIcon = (): JSX.Element => (
    <svg {...base}>
        <circle cx="7" cy="7" r="4.5" />
        <path d="m13.5 13.5-3.3-3.3M5 7h4M7 5v4" />
    </svg>
);

export const ZoomOutIcon = (): JSX.Element => (
    <svg {...base}>
        <circle cx="7" cy="7" r="4.5" />
        <path d="m13.5 13.5-3.3-3.3M5 7h4" />
    </svg>
);

export const ResetCamIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" />
    </svg>
);

export const CenterIcon = (): JSX.Element => (
    <svg {...base}>
        <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="8" cy="8" r="4.8" />
        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" />
    </svg>
);

export const OrientIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M8 13.5V8L3.5 5M8 8l4.5-3" />
        <path d="M8 2.5 3.5 5v6L8 13.5l4.5-2.5V5L8 2.5Z" />
    </svg>
);

export const PanIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M8 2v12M2 8h12" />
        <path d="m6 3.8 2-2 2 2M6 12.2l2 2 2-2M3.8 6l-2 2 2 2M12.2 6l2 2-2 2" />
    </svg>
);

export const OrbitIcon = (): JSX.Element => (
    <svg {...base}>
        <circle cx="8" cy="8" r="3" />
        <path d="M13.6 5.7c1 2.5-1.5 5.7-5.6 7.3-2.2.9-4.4 1-5.9.6" />
        <path d="M2.4 10.3c-1-2.5 1.5-5.7 5.6-7.3 2.2-.9 4.4-1 5.9-.6" />
    </svg>
);

export const OrthoIcon = (): JSX.Element => (
    <svg {...base}>
        <rect x="4.5" y="4.5" width="9" height="9" />
        <path d="M4.5 4.5 2.5 2.5m11 2-2-2m-9 11-2-2" />
        <rect x="2.5" y="2.5" width="9" height="9" opacity="0.45" />
    </svg>
);

export const FocusIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M2.5 5.5v-3h3M13.5 5.5v-3h-3M2.5 10.5v3h3M13.5 10.5v3h-3" />
        <circle cx="8" cy="8" r="2" />
    </svg>
);

export const EyeIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8Z" />
        <circle cx="8" cy="8" r="1.8" />
    </svg>
);

export const EyeOffIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M3 3l10 10" />
        <path d="M6.4 4.2A6.7 6.7 0 0 1 8 4c4 0 6.2 4 6.2 4a11 11 0 0 1-2 2.4M4.3 5.4A10.5 10.5 0 0 0 1.8 8S4 12 8 12c.7 0 1.4-.1 2-.3" />
    </svg>
);

export const HighlightIcon = (): JSX.Element => (
    <svg {...base}>
        <circle cx="8" cy="8" r="2.2" />
        <circle cx="8" cy="8" r="5.4" strokeDasharray="2.4 2.2" />
    </svg>
);

export const DownloadIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M8 2.5v7M5 6.8 8 9.8l3-3M3 11v2.5h10V11" />
    </svg>
);

export const UploadIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M8 9.5v-7M5 5.2l3-3 3 3M3 11v2.5h10V11" />
    </svg>
);

export const ClearIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
);

export const ChevronIcon = (): JSX.Element => (
    <svg {...base} width={12} height={12} className="chevron">
        <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
);

export const PathsIcon = (): JSX.Element => (
    <svg {...base}>
        <path d="M2.5 12.5c3-6 5-1 7-4s2-5 4-5" strokeDasharray="3 2" />
        <circle cx="13.5" cy="3.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
);

// filament wordmark glyph: a curved fiber with two monomers
export const FilamentGlyph = (): JSX.Element => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
            d="M4 18c5-2 4-7 7-9.5S17.5 6 18 3.5"
            stroke="#e08838"
            strokeWidth="2.2"
            strokeLinecap="round"
        />
        <circle cx="6.5" cy="8" r="1.7" fill="#56b8ce" />
        <circle cx="16" cy="16.5" r="1.7" fill="#56b8ce" />
    </svg>
);
