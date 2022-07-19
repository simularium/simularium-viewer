import { map, reduce } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";

interface CollectionInputProps {
    handler: (path: string[], key: string, value: any) => void;
    id: string;
    templateData: { [key: string]: any };
    name: string;
    path: string[];
    parameter: { [key: string]: any };
    dataType: string;
}

class CollectionInput extends React.Component<CollectionInputProps> {
    constructor(props: CollectionInputProps) {
        super(props);
        this.state = {};
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(key, index, type, targetValue) {
        const { handler, id} = this.props;
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
        this.setState(newState);
        const newValues = reduce(
            newState,
            (acc, cur: {key: any, value: any}) => {
                const key = cur.key;
                const value = cur.value;
                acc[key] = value;
                return acc;
            },
            {}
        );
        handler([id], index, newValues);
    }

    renderValueItem = (childItem, newPath, index, type) => {
        const { templateData } = this.props;
        const currentDataType = childItem.data_type;
        const data = templateData[childItem.data_type];

        if (data.isBaseType) {
            return (
                <BaseInput
                    options={childItem.options || []}
                    dataType={currentDataType}
                    name={childItem.name}
                    handler={(event) =>
                        this.handleChange(
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
                    <h4>
                        {name} collection {parameter.required && <span>*</span>}
                    </h4>
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
