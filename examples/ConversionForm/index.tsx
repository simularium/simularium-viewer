import { map } from "lodash";
import React from "react";
import InputSwitch from "./InputSwitch";

class InputForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(path, key, value) {
        let newState = {};
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
        this.setState(newState);
    }

    handleSubmit(event) {
        event.preventDefault();
        console.log("submitting", this.state);
        const payload = {
            ...this.state,
            file_contents: this.props.trajectory,
        };
        fetch(
            "https://fm4o7gwkdd.execute-api.us-west-2.amazonaws.com/v1/smoldyn",
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        )
            .then((result) => {
                return result.json()
            })
            .then((data) => {
                console.log("Completed with result:", data);
            })
            .catch((err) => {
                console.error(err);
            });

    }

    render() {
        const { template, templateData, type } = this.props;
        return (
            <div>
                <h2>Enter display data for your {type} trajectory</h2>
                {map(template.parameters, (parameter, key) => {
                    const dataType = parameter.data_type;
                    if (templateData[dataType]) {
                        return (
                            <InputSwitch
                                id={key}
                                parameter={parameter}
                                templateData={templateData}
                                dataType={dataType}
                                handler={this.handleChange}
                                path={[key]}
                            />
                        );
                    }
                })}
                <button type="submit" onClick={this.handleSubmit}>
                    Submit
                </button>
            </div>
        );
    }
}

export default InputForm;
