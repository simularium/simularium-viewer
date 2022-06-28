import { map } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";

const CompositeInput = (props) => {
    const { dataType, templateData, parameter, handler } = props;
    return (
        <div>
            <h4>{parameter.name}</h4>
            {map(templateData[dataType].parameters, (parameter, key) => {
                const nextDataType = parameter.data_type;
                if (templateData[nextDataType]) {
                    const data = templateData[nextDataType];
                    if (data.isBaseType) {
                        console.log(`${key}-${parameter.name}`);
                        return (
                            <BaseInput
                                name={parameter.name}
                                key={`${key}-${parameter.name}`}
                                handler={handler}
                            />
                        );
                    } else {
                        return (
                            <CompositeInput
                                parameter={parameter}
                                templateData={templateData}
                                dataType={nextDataType}
                                handler={handler}
                            />
                        );
                    }
                }
            })}
        </div>
    );
};

export default CompositeInput;
