import { map } from "lodash";
import React from "react";
import InputSwitch from "./InputSwitch"

interface InputFormProps {
    template: { [key: string]: any };
    templateData: { [key: string]: any };
    type: string;
    submitDisabled: boolean;
    submitFile: (data) => void;
    onReturned: () => void;
}

class InputForm extends React.Component<InputFormProps> {
    constructor(props: InputFormProps) {
        super(props);
        this.state = {};
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(path: string[], key: string, value: any) {
        let newState = {};
        if (path.length == 0) {
            newState = {
                ...this.state[key],
                [key] : value
            }
        } else {
            
            // convert the paths into a nested object
            // make sure to copy any existing state at each level
            let tempObject = newState;
            let currentState = this.state[path[0]] || {};
            path.map((nestedKey: string, i: number, array: string[]) => {
                let thisValue;
                if (i == array.length - 1) {
                    thisValue = {
                        ...currentState,
                        [key]: value,
                    };
                } else {
                    thisValue = { ...currentState };
                    currentState = currentState[array[i + 1]] || {};
                }
    
                tempObject = tempObject[nestedKey] = thisValue;
            });
        }
        this.setState(newState);
    }

    handleSubmit(event) {
        event.preventDefault();
        const payload = {
            ...this.state,
        };
        console.log("submitting", payload);
        this.props.submitFile(payload)
    }

    render() {
        const { template, templateData, type, submitDisabled } = this.props;
        return (
            <div>
                <h2>Enter display data for your {type} trajectory</h2>
                {map(template.parameters, (parameter, key) => {
                    const dataType = parameter.data_type;
                    if (templateData[dataType]) {
                        return (
                            <InputSwitch
                                handler={this.handleChange}
                                id={key}
                                templateData={templateData}
                                parameter={parameter}
                                dataType={dataType}
                                path={[key]}
                            />
                        );
                    }
                })}
                <button type="submit" onClick={this.handleSubmit} disabled={submitDisabled}>
                    Submit
                </button>
            </div>
        );
    }
}

export default InputForm;
