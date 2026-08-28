import React, { useState } from "react";

import { UIDisplayData } from "@aics/simularium-viewer";

type ColorPickerProps = {
    uiDisplayData: UIDisplayData;
    particleTypeNames: string[];
    agentColors: string[] | number[];
    setColorSelectionInfo: (data: UIDisplayData) => void;
    updateAgentColorArray: (color: string) => void;
};

const ColorPicker = ({
    uiDisplayData,
    particleTypeNames,
    agentColors,
    setColorSelectionInfo,
    updateAgentColorArray,
}: ColorPickerProps): JSX.Element => {
    const [subAgents, setSubAgents] = useState([{ name: "", id: "" }]);
    const [selectedAgent, setSelectedAgent] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [selectedSubagent, setSelectedSubAgent] = useState("");
    const [colorToAppend, setColorToAppend] = useState("");

    const getSubAgentsforAgent = (agentName: string) => {
        const agent = uiDisplayData.find(
            (element) => element.name === agentName
        );
        if (!agent) {
            setSubAgents([{ name: "<unmodified>", id: "<unmodified>" }]);
            return;
        }
        if (agent.displayStates.length === 0) {
            setSubAgents([{ name: "<unmodified>", id: "<unmodified>" }]);
            return;
        }
        setSubAgents(agent.displayStates);
    };

    const handleAgentSelection = (event) => {
        const value = event.target.value;
        if (value) {
            getSubAgentsforAgent(value);
        }
        setSelectedAgent(value);
    };

    const assignColorToAgent = () => {
        if (!selectedAgent || !selectedColor) {
            return;
        }
        let subAgent: string[] = selectedSubagent ? [selectedSubagent] : [];
        // hooks doesn't save an empty string
        // but an empty string is a possible tag
        // that represents the unmodified state
        if (selectedSubagent === "<unmodified>") {
            subAgent = [""];
        }
        const appliedColors = uiDisplayData.map((agent) => {
            const newAgent = { ...agent };
            if (agent.name === selectedAgent) {
                if (subAgent.includes("")) {
                    newAgent.color = selectedColor;
                }
                const newDisplayStates = agent.displayStates.map(
                    (state: any) => {
                        if (subAgent.includes(state.id) || !subAgent.length) {
                            return {
                                ...state,
                                color: selectedColor,
                            };
                        }
                        return state;
                    }
                );
                newAgent.displayStates = newDisplayStates;
            }
            return newAgent;
        });
        setColorSelectionInfo(appliedColors);
    };

    const addColorToColorArray = (customColor: string) => {
        const hexColorCodeRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (hexColorCodeRegex.test(customColor)) {
            updateAgentColorArray(customColor);
            setSelectedColor(customColor);
            setColorToAppend("");
        } else {
            alert("Enter a hex color like #e08838");
        }
    };

    return (
        <>
            <div className="row">
                <select
                    id="agentSelect"
                    onChange={handleAgentSelection}
                    style={{ flex: 1, minWidth: 0 }}
                    aria-label="Agent to recolor"
                >
                    <option value="">Agent…</option>
                    {particleTypeNames.map((name: string) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
                <select
                    id="subAgentSelect"
                    onChange={(event) =>
                        setSelectedSubAgent(event.target.value)
                    }
                    style={{ flex: 1, minWidth: 0 }}
                    aria-label="Sub-agent state"
                >
                    <option value="">All states</option>
                    {subAgents.map((subAgent) => (
                        <option
                            key={subAgent.name}
                            value={subAgent.id || subAgent.name}
                        >
                            {subAgent.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="swatch-grid">
                {agentColors.map((color) => (
                    <button
                        key={color}
                        className={`swatch-btn${
                            selectedColor === color ? " selected" : ""
                        }`}
                        style={{ background: String(color) }}
                        onClick={() => setSelectedColor(String(color))}
                        title={String(color)}
                        aria-label={`Select color ${color}`}
                    />
                ))}
            </div>
            <div className="row">
                <input
                    id="colorAddition"
                    type="text"
                    placeholder="#hex"
                    value={colorToAppend}
                    style={{ width: 80 }}
                    onChange={(event) => {
                        setColorToAppend(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            addColorToColorArray(colorToAppend);
                        }
                    }}
                />
                <button
                    className="ghost"
                    onClick={() => addColorToColorArray(colorToAppend)}
                >
                    Add color
                </button>
                <button
                    onClick={assignColorToAgent}
                    disabled={!selectedAgent || !selectedColor}
                    style={{ marginLeft: "auto" }}
                >
                    Apply
                </button>
            </div>
        </>
    );
};

export default ColorPicker;
