import { map } from "lodash";
import React from "react";
import JsonFileReader from "../../src/simularium/JsonFileReader";
import { FileReturn } from "../../src/simularium/types";
import { loadSimulariumFile } from "../../src/util";
import InputSwitch from "./InputSwitch";

interface InputFormProps {
    template: { [key: string]: any };
    templateData: { [key: string]: any };
    type: string;
    trajectory: string;
    loadFile: (file, fileName, geoAssets?) => Promise<FileReturn | void>;
    onReturned: () => void;
}

class InputForm extends React.Component<InputFormProps> {
    constructor(props: InputFormProps) {
        super(props);
        this.state = {};
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(path, key, value) {
        // convert the paths into a nested object
        // make sure to copy any existing state at each level
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
        console.log(newState);
        this.setState(newState);
    }

    handleSubmit(event) {
        event.preventDefault();
        const payload = {
            ...this.state,
            file_contents: this.props.trajectory,
        };
        console.log("submitting", payload);
        fetch(
            "https://fm4o7gwkdd.execute-api.us-west-2.amazonaws.com/v1/smoldyn",
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        )
            .then((result) => {
                this.props.onReturned();
                return result.json();
            })
            .then((file) => {
                console.log("Completed with result:", file);
                const simulariumFile = new JsonFileReader(file);
                this.props.loadFile(simulariumFile, "test.simularium").then();
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
                <button type="submit" onClick={this.handleSubmit}>
                    Submit
                </button>
            </div>
        );
    }
}

export default InputForm;
