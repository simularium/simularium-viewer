import { map } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";

const CollectionInput = (props) => {
    const { templateData } = props;
    const renderValueItem = (childItem) => {
        const currentDataType = childItem.data_type;
        const data = templateData[childItem.data_type];
        if (data.isBaseType) {
            return (
                <BaseInput
                    parameter={childItem}
                    options={childItem.options || []}
                    dataType={currentDataType}
                    name={childItem.name}
                    handler={props.handler}
                />
            );
        } else if (data.parameters) {
            return map(data.parameters, (childParameter, key) => {
                return renderValueItem(childParameter);
            });
        }
    };
    return (
        <div>
            <h4>{props.name} collection</h4>
            <div>
                Key:
                {renderValueItem(props.parameter.key_item)}
            </div>
            <div>
                Value: 
                {renderValueItem(props.parameter.value_item)}
            </div>
        </div>
    );
};

export default CollectionInput;
