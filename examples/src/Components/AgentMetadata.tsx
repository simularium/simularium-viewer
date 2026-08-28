import React from "react";
import { AgentData } from "@aics/simularium-viewer";

interface AgentMetadataProps {
    agentData: AgentData | null;
}

const fmt = (value: number): string =>
    Number.isFinite(value) ? value.toFixed(2) : "–";

const AgentMetadata = ({ agentData }: AgentMetadataProps): JSX.Element => {
    if (!agentData || agentData.instanceId === -1) {
        return (
            <div className="note">
                Click an agent in the viewport to follow it here.
            </div>
        );
    }
    return (
        <div className="readout">
            <div>
                <span className="k">type </span>
                <span className="v accent">{agentData.type}</span>
            </div>
            <div>
                <span className="k">id </span>
                <span className="v">{agentData.instanceId}</span>
            </div>
            <div>
                <span className="k">xyz </span>
                <span className="v">
                    {fmt(agentData.x)}, {fmt(agentData.y)}, {fmt(agentData.z)}
                </span>
            </div>
            <div>
                <span className="k">rot </span>
                <span className="v">
                    {fmt(agentData.xrot)}, {fmt(agentData.yrot)},{" "}
                    {fmt(agentData.zrot)}
                </span>
            </div>
            <div>
                <span className="k">radius </span>
                <span className="v">{fmt(agentData.cr)}</span>
            </div>
        </div>
    );
};

export default AgentMetadata;
