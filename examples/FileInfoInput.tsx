import { map } from "lodash";
import React from "react";
import BaseInput from "./ConversionForm/BaseInput";
import CompositeInput from "./ConversionForm/CompositeInput";

class InputForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = { value: "" };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(key, value) {
        this.setState({ [key]: value });
    }

    handleSubmit(event) {
        event.preventDefault();
    }

    render() {
        const { template, templateData } = this.props;
        return (
            <div>
                <h3>
                    Enter display data for your {template["python::object"]}{" "}
                    trajectory
                </h3>
                {map(template.smoldyn_data.parameters, (parameter, key) => {
                    const dataType = parameter.data_type;
                    if (templateData[dataType]) {
                        const data = templateData[dataType];
                        if (data.isBaseType) {
                            console.log(`${key}-${parameter.name}`);
                            return (
                                <BaseInput
                                    name={parameter.name}
                                    key={key}
                                    handler={(event) =>
                                        this.handleChange(
                                            parameter.name,
                                            event.target.value
                                        )
                                    }
                                />
                            );
                        } else {
                            return (
                                <CompositeInput
                                    parameter={parameter}
                                    templateData={templateData}
                                    dataType={dataType}
                                    handler={(event) =>
                                        this.handleChange(
                                            parameter.name,
                                            event.target.value
                                        )
                                    }
                                />
                            );
                        }
                    }
                })}
            </div>
        );
    }
}

export default InputForm;
