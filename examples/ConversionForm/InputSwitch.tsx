import { map } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";
import CollectionInput from "./CollectionInput";

const InputSwitch = (props) => {
    const { dataType, templateData, parameter, handler, path, id } = props;
    const renderParameter = (currentDataType, key, parameter, recursive) => {
        const data = templateData[currentDataType];
        if (currentDataType === "collection") {
            return (
                <CollectionInput
                    parameter={parameter}
                    templateData={templateData}
                    dataType={currentDataType}
                    name={parameter.name}
                    handler={handler}
                    path={path}
                    id={key}
                />
            );
        } else if (data.isBaseType) {
            return (
                <BaseInput
                    dataType={currentDataType}
                    options={parameter.options || []}
                    name={parameter.name}
                    handler={(event) => handler(path, key, event.target.value)}
                />
            );
        } else if (recursive) {
            return (
                <InputSwitch
                    parameter={parameter}
                    templateData={templateData}
                    dataType={currentDataType}
                    handler={handler}
                    path={[...path, key]}
                />
            );
        }
    };

    return (
        <div>
            {path.length == 1 ? (
                <h3>
                    {parameter.name} <small>({parameter.description})</small>
                </h3>
            ) : (
                <h4>
                    {parameter.name} <small>({parameter.description})</small>
                </h4>
            )}
            {renderParameter(dataType, id, parameter, false)}
            {map(templateData[dataType].parameters, (childParameter, key) => {
                const currentDataType = childParameter.data_type;
                return renderParameter(
                    currentDataType,
                    key,
                    childParameter,
                    true
                );
            })}
        </div>
    );
};

export default InputSwitch;
