import React from "react";
import { AgentData } from "../../type-declarations/simularium/types.js"

interface AgentMetadataProps {
    agentData: AgentData;
}

const AgentMetadata = ({ agentData }: AgentMetadataProps): JSX.Element => {

    const getContents = () => {
        if (agentData.instanceId === -1) {
            return <div>No agent selected</div>;
        }
        return (
            <div>
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

    return <div>Agent Metadata: {getContents()}</div>;
};

export default AgentMetadata;
