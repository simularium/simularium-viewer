import { map, reduce } from "lodash";
import React from "react";
import BaseInput from "./BaseInput";
import CompositeInput from "./CompositeInput";

class InputForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(path, key, value) {
   
        let newState = {}
        let tempObject = newState
        
        let currentState = this.state[path[0]] || {};
        path.map((nestedKey: string, i: number, array: string[]) => {
            let thisValue;
            if (i == array.length - 1) {
                thisValue = {
                    ...currentState,
                    [key]: value
                }
            } else {
                thisValue = {...currentState} 
                currentState = currentState[array[i + 1]] || {}
            }
        
            tempObject = tempObject[nestedKey] = thisValue
        });
        this.setState(newState);
    }

    handleSubmit(event) {
        event.preventDefault();
        console.log("submitting", this.state)
    }

    render() {
        const { template, templateData, type } = this.props;
        return (
            <div>
                <h3>
                    Enter display data for your {type}{" "}
                    trajectory
                </h3>
                {map(template.parameters, (parameter, key) => {
                    const dataType = parameter.data_type;
                    if (templateData[dataType]) {
                        const data = templateData[dataType];
                        if (data.isBaseType) {
                            return (
                                <BaseInput
                                    name={parameter.name}
                                    key={key}
                                    data={data}
                                    handler={(event) =>
                                        this.handleChange(
                                            [],
                                            key,
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
                                    handler={this.handleChange}
                                    parentGroup={dataType}
                                    path={[key]}
                                />
                            );
                        }
                    }
                })}
            <button type="submit" onClick={this.handleSubmit}>Submit</button>/>
            </div>
        );
    }
}

export default InputForm;
