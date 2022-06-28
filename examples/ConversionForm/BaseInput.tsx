import React from "react";

export default (props) => {
    return (<label> {props.name}
        <input type="text" onChange={props.handler}/>
    </label>)
}