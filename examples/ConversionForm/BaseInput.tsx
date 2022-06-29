import React from "react";

export default (props) => { 
    console.log(props)
    return (<label> {props.name}
        <input type="text" onChange={props.handler}/>
    </label>)
}