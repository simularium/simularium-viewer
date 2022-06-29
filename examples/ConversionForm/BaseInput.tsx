import React from "react";

interface BaseInputProps {
    dataType: string;
    handler: (event) => void;
    options?: [];
    name: string;
}
const BaseInput = (props: BaseInputProps) => {
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
                <select onChange={props.handler}>
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