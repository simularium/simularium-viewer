import React from "react";
import { SimulariumController } from "../../../src";

interface CameraControlsProps {
    controller: SimulariumController;
    showPaths: () => void;
    setRenderStyle: () => void;
    setPanMode: () => void;
    setFocusMode: () => void;
    setCameraMode: () => void;
}

const CameraControls = (props: CameraControlsProps): JSX.Element => {
    const {
        controller,
        showPaths,
        setRenderStyle,
        setPanMode,
        setFocusMode,
        setCameraMode,
    } = props;

    const resetCamera = () => {
        controller.resetCamera();
    };

    const centerCamera = () => {
        controller.centerCamera();
    };

    const reOrientCamera = () => {
        controller.reOrientCamera();
    };

    const zoomIn = () => {
        controller.zoomIn();
    };

    const zoomOut = () => {
        controller.zoomOut();
    };

    return (
        <>
            <button onClick={showPaths}>ShowPaths</button>
            <button onClick={setRenderStyle}>Switch Render</button>
            <button onClick={resetCamera}>Reset camera</button>
            <button onClick={centerCamera}>center camera</button>
            <button onClick={reOrientCamera}>starting orientation</button>
            <button onClick={zoomIn}>+</button>
            <button onClick={zoomOut}>-</button>
            <button onClick={setPanMode}>Pan/Rotate Mode</button>
            <button onClick={setFocusMode}>Focus Mode</button>
            <button onClick={setCameraMode}>Camera mode</button>
        </>
    );
};

export default CameraControls;
