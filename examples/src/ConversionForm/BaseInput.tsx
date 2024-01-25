import React from "react";

interface BaseInputProps {
    dataType: string;
    handler: (event) => void;
    name: string;
    options: string[];
}

const BaseInput = (props: BaseInputProps) => {
    switch (props.dataType) {
        case "string":
            return (
                <label>
                    {" "}
                    {props.name}
                    <input
                        type="text"
                        onChange={(e) => props.handler(e.target.value)}
                    />
                </label>
            );
        case "number":
            return (
                <label>
                    {" "}
                    {props.name}
                    <input
                        type="number"
                        onChange={(e) => props.handler(Number(e.target.value))}
                    />
                </label>
            );
        case "enum":
            const { options } = props;
            return (
                <select onChange={(e) => props.handler(e.target.value)}>
                    {options.map((id) => (
                        <option value={id}>{id}</option>
                    ))}
                </select>
            );
        case "file":
            return (
                <label>
                    {" "}
                    {props.name}
                    <input
                        type="file"
                        onChange={async (e) => {
                            if (!e.target.files) {
                                return;
                            }
                            const file = e.target.files[0];
                            const trajectory = await file.text();
                            return props.handler(trajectory);
                        }}
                    />
                </label>
            );
        default:
            return (
                <label>
                    {" "}
                    {props.name}
                    <input
                        type="text"
                        onChange={(e) => props.handler(e.target.value)}
                    />
                </label>
            );
    }
};

export default BaseInput;
