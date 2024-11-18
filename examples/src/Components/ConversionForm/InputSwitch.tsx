import { map } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";
import CollectionInput from "./CollectionInput";

interface InputSwitchProps {
    handler: (path: string[], key: string, value: any) => void;
    id: string;
    templateData: { [key: string]: any };
    path: string[];
    parameter: { [key: string]: any };
    dataType: string;
}

const InputSwitch = (props: InputSwitchProps) => {
    const { dataType, templateData, parameter, handler, path, id } = props;

    const renderParameter = (currentDataType: string, key: string, currentParameter, recursive: boolean) => {
        const data = templateData[currentDataType];
        if (currentDataType === "collection") {
            return (
                <CollectionInput
                    parameter={currentParameter}
                    templateData={templateData}
                    dataType={currentDataType}
                    name={currentParameter.name}
                    handler={handler}
                    path={path}
                    id={key}
                />
            );
        } else if (data.isBaseType) {
            return (
                <BaseInput
                    dataType={currentDataType}
                    options={currentParameter.options || []}
                    name={currentParameter.name}
                    handler={(value) => {
                        return handler(path, key, value);
                    }}
                />
            );
        } else if (recursive) {
            return (
                <InputSwitch
                    id={key}
                    parameter={currentParameter}
                    templateData={templateData}
                    dataType={currentDataType}
                    handler={handler}
                    path={[...path, key]}
                />
            );
        }
    };
    const hasChildren = !!templateData[dataType].parameters;
    return (
        <div style={{ borderTop: "1px solid black", padding: 20 }}>
            {path.length <= 1 ? (
                <h3>
                    {parameter.name}{" "}
                    <small>
                        ({parameter.description}){parameter.required && <span>*</span>}
                    </small>
                </h3>
            ) : (
                <h4>
                    {parameter.name}{" "}
                    <small>
                        ({parameter.description}) {parameter.required && <span>*</span>}
                    </small>
                </h4>
            )}

            {hasChildren
                ? map(templateData[dataType].parameters, (childParameter, key) => {
                      const currentDataType = childParameter.data_type;
                      return renderParameter(currentDataType, key, childParameter, true);
                  })
                : renderParameter(dataType, id, parameter, false)}
        </div>
    );
};

export default InputSwitch;
