import { map } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";

const CompositeInput = (props) => {
    const {
        dataType,
        templateData,
        parameter,
        handler,
        parentGroup,
        path,
    } = props;
    return (
        <div>
            <h4>{parameter.name}</h4>
            {map(templateData[dataType].parameters, (parameter, key) => {
                const currentDataType = parameter.data_type;
                if (templateData[currentDataType]) {
                    const data = templateData[currentDataType];
                    if (data.isBaseType) {
                 
                        return (
                            <BaseInput
                                name={parameter.name}
                                data={data}
                                key={`${key}-${parameter.name}`}
                                handler={(event) =>
                                    handler(path, key, event.target.value)
                                }
                            />
                        );
                    } else {
                        return (
                            <CompositeInput
                                parameter={parameter}
                                templateData={templateData}
                                dataType={currentDataType}
                                previousDataType={dataType}
                                handler={handler}
                                parentGroup={parentGroup}
                                path={[...path, key]}
                            />
                        );
                    }
                }
            })}
        </div>
    );
};

export default CompositeInput;
