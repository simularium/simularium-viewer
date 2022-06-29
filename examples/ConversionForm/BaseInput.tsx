import React from "react";

const BaseInput =  (props) => {

    switch (props.dataType) {
        case "string":
            return (
                <label>
                    {" "}
                    {props.name}
                    <input type="text" onChange={props.handler} />
                </label>
            );
        case "number":
            return (
                <label>
                    {" "}
                    {props.name}
                    <input type="number" onChange={props.handler} />
                </label>
            );
        case "enum":
            return (
                <select>
                    {props.options.map((id) => (
                        <option value={id}>{id}</option>
                    ))}
                </select>
            );
   
            
        default:
            return (
                <label>
                    {" "}
                    {props.name}
                    <input type="text" onChange={props.handler} />
                </label>
            );
    }
};

export default BaseInput;