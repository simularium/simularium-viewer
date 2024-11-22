import React, { useState } from "react";
import { UIDisplayData } from "../../src.js"

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
            throw new Error("No agent found");
        }
        setSubAgents(agent.displayStates);
    };

    const handleAgentSelection = (event) => {
        const value = event.target.value;
        getSubAgentsforAgent(value);
        setSelectedAgent(value);
    };

    const assignColorToAgent = () => {
        if (!selectedAgent) {
            throw new Error("No agent selected");
        } else if (!selectedColor) {
            throw new Error("No color selected");
        } else {
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
                            if (
                                subAgent.includes(state.id) ||
                                !subAgent.length
                            ) {
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
        }
    };

    const addColorToColorArray = (customColor: string) => {
        const hexColorCodeRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        const color = customColor;
        if (hexColorCodeRegex.test(color)) {
            updateAgentColorArray(color);
        } else {
            alert("Please enter a valid hex color code");
        }
    };

    return (
        <>
            <span>Color change agent selections:</span>
            <select id="agentSelect" onChange={handleAgentSelection}>
                <option value=""> Select Agent</option>
                {particleTypeNames.map((name: string) => (
                    <option key={name} value={name}>
                        {name}
                    </option>
                ))}
            </select>
            <select
                id="subAgentSelect"
                onChange={(event) => setSelectedSubAgent(event.target.value)}
            >
                <option value="">Select Sub-Agent</option>
                {subAgents.map((subAgent) => (
                    <option
                        key={subAgent.name}
                        value={subAgent.id || subAgent.name}
                    >
                        {subAgent.name}
                    </option>
                ))}
            </select>
            <select
                id="colorSelect"
                onChange={(event) => setSelectedColor(event.target.value)}
                defaultValue={selectedColor}
                style={{ backgroundColor: selectedColor }}
            >
                <option value="">Select Color</option>
                {agentColors.map((name) => (
                    <option key={name} value={name}>
                        {name}
                    </option>
                ))}
            </select>
            <button onClick={assignColorToAgent}> Apply Color to Agent</button>
            <input
                id="colorAddition"
                type="text"
                placeholder="add Hex Color"
                onChange={(event) => {
                    setColorToAppend(event.target.value);
                }}
            ></input>
            <button onClick={() => addColorToColorArray(colorToAppend)}>
                Add color to color array
            </button>
        </>
    );
};

export default ColorPicker;
