import React from "react";

interface AgentSelectionControlsProps {
    particleTypeNames: string[];
    hiddenAgents: Array<{ name: string }>;
    onVisibilityChange: (value: string) => void;
    onHighlightChange: (value: string) => void;
    hideAllAgents: boolean;
    onToggleAllAgents: (
        hiddenAgents: Array<{ name: string; tags: string[] }>
    ) => void;
}

const AgentSelectionControls: React.FC<AgentSelectionControlsProps> = ({
    particleTypeNames,
    hiddenAgents,
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
    return (
        <div className="ui-container flex vertical">
            <button onClick={handleToggleAll}>
                {hideAllAgents ? "Show all agents" : "Hide all agents"}
            </button>
            <div>
                <div className="agent-boxes">
                    {particleTypeNames.map((id) => (
                        <div key={id}>
                            <label htmlFor={`visibility-${id}`}>{id}</label>
                            <div>
                                <input
                                    id={`visibility-${id}`}
                                    type="checkbox"
                                    onChange={(event) =>
                                        onVisibilityChange(event.target.value)
                                    }
                                    value={id}
                                    checked={
                                        hiddenAgents.find(
                                            (element) => element.name === id
                                        ) === undefined
                                    }
                                />
                                <input
                                    id={`highlight-${id}`}
                                    type="checkbox"
                                    onChange={(event) =>
                                        onHighlightChange(event.target.value)
                                    }
                                    value={id}
                                    defaultChecked={false}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AgentSelectionControls;
