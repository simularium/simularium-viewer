import { map, reduce } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";

class CollectionInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(path, key, index, type, targetValue) {
        const { handler } = this.props;
        const newState = { ...this.state };
        if (!newState[index]) {
            newState[index] = {
                key: "",
                value: {},
            };
        }
        if (type === "key") {
            newState[index] = {
                ...newState[index],
                [type]: targetValue,
            };
        } else {
            newState[index] = {
                ...newState[index],
                [type]: {
                    ...newState[index][type],
                    [key]: targetValue,
                },
            };
        }

        console.log("new state", newState);
        this.setState(newState);
        const newValues = reduce(newState, (acc, cur) => {
            const key = cur.key;
            const value = cur.value;
            acc[key] = value 
            return acc
        }, {})
        handler(path, key, newValues);
    }

    renderValueItem = (childItem, newPath, index, type) => {
        const { templateData, id } = this.props;
        const currentDataType = childItem.data_type;
        const data = templateData[childItem.data_type];

        if (data.isBaseType) {
            return (
                <BaseInput
                    parameter={childItem}
                    options={childItem.options || []}
                    dataType={currentDataType}
                    name={childItem.name}
                    handler={(event) =>
                        this.handleChange(
                            newPath,
                            newPath[newPath.length - 1],
                            index,
                            type,
                            event.target.value
                        )
                    }
                />
            );
        } else if (data.parameters) {
            return map(data.parameters, (childParameter, key) => {
                return this.renderValueItem(
                    childParameter,
                    [...newPath, key],
                    index,
                    type
                );
            });
        }
    };

    render() {
        const { name, path, parameter } = this.props;
        for (let index = 0; index < parameter.length; index++) {
            return (
                <div>
                    <h4>{name} collection</h4>
                    <div>
                        Key:
                        {this.renderValueItem(
                            parameter.key_item,
                            path,
                            index,
                            "key"
                        )}
                    </div>
                    <div>
                        Value:
                        {this.renderValueItem(
                            parameter.value_item,
                            path,
                            index,
                            "value"
                        )}
                    </div>
                </div>
            );
        }
    }
}

export default CollectionInput;
