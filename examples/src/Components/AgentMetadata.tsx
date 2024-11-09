import React from "react";
import { AgentData } from "../../../type-declarations/simularium/types";

interface AgentMetadataProps {
    agentData: AgentData;
}

const AgentMetadata = ({ agentData }: AgentMetadataProps): JSX.Element => {
    const getContents = () => {
        if (agentData.instanceId === -1) {
            return <div className="ui-container">No agent selected</div>;
        }
        return (
            <div className="ui-container">
                <div>Agent metadata</div>
                <div> uniqueID: {agentData.instanceId}</div>
                <div> agentType: {agentData.type}</div>
                <div>
                    position: x = {agentData.x}, y = {agentData.y}, z =
                    {agentData.z}
                </div>
                <div>
                    rotation: x = {agentData.xrot}, y = {agentData.yrot}, z =
                    {agentData.zrot}
                </div>
                <div> radius: {agentData.cr}</div>
            </div>
        );
    };

    return getContents();
};

export default AgentMetadata;
