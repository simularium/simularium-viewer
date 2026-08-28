import React from "react";
import { UIDisplayData } from "@aics/simularium-viewer";
import { EyeIcon, EyeOffIcon, HighlightIcon } from "./Icons";

interface AgentSelectionControlsProps {
    particleTypeNames: string[];
    uiDisplayData: UIDisplayData;
    agentColors: string[] | number[];
    hiddenAgents: Array<{ name: string }>;
    highlightedAgents: Array<{ name: string }>;
    onVisibilityChange: (value: string) => void;
    onHighlightChange: (value: string) => void;
    hideAllAgents: boolean;
    onToggleAllAgents: (
        hiddenAgents: Array<{ name: string; tags: string[] }>
    ) => void;
}

const AgentSelectionControls: React.FC<AgentSelectionControlsProps> = ({
    particleTypeNames,
    uiDisplayData,
    agentColors,
    hiddenAgents,
    highlightedAgents,
    onVisibilityChange,
    onHighlightChange,
    hideAllAgents,
    onToggleAllAgents,
}) => {
    const handleToggleAll = () => {
        let newHiddenAgents: Array<{ name: string; tags: string[] }> = [];
        if (!hideAllAgents) {
            newHiddenAgents = particleTypeNames.map((name) => ({
                name,
                tags: [],
            }));
        }
        onToggleAllAgents(newHiddenAgents);
    };

    const colorFor = (name: string, index: number): string => {
        const fromDisplayData = uiDisplayData.find(
            (agent) => agent.name === name
        )?.color;
        if (fromDisplayData) {
            return fromDisplayData;
        }
        const fallback = agentColors[index % agentColors.length];
        return typeof fallback === "string" ? fallback : "#8f929c";
    };

    if (particleTypeNames.length === 0) {
        return (
            <div className="note">
                Agent types appear here once a trajectory loads.
            </div>
        );
    }

    return (
        <>
            <div className="agent-list">
                {particleTypeNames.map((id, index) => {
                    const isHidden = hiddenAgents.some(
                        (agent) => agent.name === id
                    );
                    const isHighlighted = highlightedAgents.some(
                        (agent) => agent.name === id
                    );
                    return (
                        <div
                            key={id}
                            className={`agent-row${
                                isHidden ? " hidden-agent" : ""
                            }`}
                        >
                            <span
                                className="swatch"
                                style={{ background: colorFor(id, index) }}
                            />
                            <span className="agent-name" title={id}>
                                {id}
                            </span>
                            <button
                                className={`icon-btn hl${
                                    isHighlighted ? " on" : ""
                                }`}
                                onClick={() => onHighlightChange(id)}
                                title={
                                    isHighlighted
                                        ? "Remove highlight"
                                        : "Highlight agent type"
                                }
                                aria-label={`Toggle highlight for ${id}`}
                            >
                                <HighlightIcon />
                            </button>
                            <button
                                className={`icon-btn${
                                    isHidden ? "" : " on"
                                }`}
                                onClick={() => onVisibilityChange(id)}
                                title={isHidden ? "Show agent type" : "Hide agent type"}
                                aria-label={`Toggle visibility for ${id}`}
                            >
                                {isHidden ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    );
                })}
            </div>
            <button className="ghost" onClick={handleToggleAll}>
                {hideAllAgents ? "Show all" : "Hide all"}
            </button>
        </>
    );
};

export default AgentSelectionControls;
