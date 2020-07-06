import React from "react";

import SimulariumViewer, { NetConnection, SimulariumController } from "../dist";
import { Orchestrator } from "../dist";
import "./style.css";
import { CLIENT_RENEG_WINDOW } from "tls";

const netConnectionSettings = {
    serverIp: "staging-node1-agentviz-backend.cellexplore.net",
    serverPort: 9002,
};

interface ViewerState {
    highlightId: number;
    pauseOn: number;
    particleTypeIds: string[];
    currentFrame: number;
    currentTime: number;
    height: number;
    width: number;
    showMeshes: boolean;
    showPaths: boolean;
    timeStep: number;
    totalDuration: number;
}

const simulariumController = new SimulariumController({
    trajectoryPlaybackFile: "ATPsynthase_9.h5",
    netConnectionSettings: netConnectionSettings,
});

let currentFrame = 0;
let currentTime = 0;

const intialState = {
    highlightId: -1,
    pauseOn: -1,
    particleTypeIds: [],
    currentFrame: 0,
    currentTime: 0,
    height: 800,
    width: 800,
    showMeshes: true,
    showPaths: true,
    timeStep: 1,
    totalDuration: 100,
};

const changeFile = (file: string) => () => simulariumController.changeFile(file);

class Viewer extends React.Component<{}, ViewerState> {
    private viewerRef: React.RefObject<SimulariumViewer>;

    public constructor(props) {
        super(props);
        this.viewerRef = React.createRef();
        this.handleJsonMeshData = this.handleJsonMeshData.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.playOneFrame = this.playOneFrame.bind(this);
        this.highlightParticleType = this.highlightParticleType.bind(this);
        this.state = intialState;
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => {
            const container = document.querySelector(".container");

            const height = container.clientHeight;
            const width = container.clientWidth;
            this.setState({ height, width });
        });
    }

    public handleJsonMeshData(jsonData): void {
        this.setState({ particleTypeIds: Object.keys(jsonData) });
    }

    public handleTimeChange(timeData): void {
        currentFrame = timeData.frameNumber;
        currentTime = timeData.time;
        this.setState({ currentFrame, currentTime });
        if (this.state.pauseOn === currentFrame) {
            simulariumController.pause();
            this.setState({ pauseOn: -1 });
        }
    }

    public highlightParticleType(typeId): void {
        this.setState({ highlightId: typeId });
    }

    public playOneFrame(): void {
        const frame = Number(document.querySelector("#frame-number").value);
        simulariumController.playFromFrame(frame);

        this.setState({ pauseOn: frame + 1 });
    }

    public handleTrajectoryInfo(data): void {
        console.log("Trajectory info arrived", data);
        this.state.totalDuration = data.totalDuration;
        this.state.timeStep = data.timeStepSize;

        currentTime = 0;
        currentFrame = 0;
    }

    public handleScrubTime(event): void {
        simulariumController.gotoTime(event.target.value);
    }

    public gotoNextFrame(): void {
        simulariumController.gotoTime(currentTime + this.state.timeStep + 1e-9);
    }

    public gotoPreviousFrame(): void {
        simulariumController.gotoTime(currentTime - this.state.timeStep - 1e-9);
    }

    public render(): JSX.Element {
        return (
            <div className="container" style={{ height: "90%", width: "75%" }}>
                <button onClick={() => simulariumController.start()}>Start</button>
                <button onClick={() => simulariumController.pause()}>Pause</button>
                <button onClick={() => simulariumController.resume()}>Resume</button>
                <button onClick={() => simulariumController.stop()}>stop</button>
                <button onClick={changeFile("test_traj1.h5")}>TEST</button>
                <button onClick={changeFile("microtubules_v2_shrinking.h5")}>
                    MTub
                </button>
                <button onClick={changeFile("aster.cmo")}>Aster</button>
                <button onClick={changeFile("actin34_0.h5")}>Actin 34</button>
                <button onClick={changeFile("microtubules30_1.h5")}>
                    MT 30
                </button>
                <button onClick={changeFile("ATPsynthase_1.h5")}>ATP 1</button>
                <button onClick={changeFile("ATPsynthase_2.h5")}>ATP 2</button>
                <button onClick={changeFile("ATPsynthase_3.h5")}>ATP 3</button>
                <button onClick={changeFile("ATPsynthase_4.h5")}>ATP 4</button>
                <button onClick={changeFile("ATPsynthase_5.h5")}>ATP 5</button>
                <button onClick={changeFile("ATPsynthase_6.h5")}>ATP 6</button>
                <button onClick={changeFile("ATPsynthase_7.h5")}>ATP 7</button>
                <button onClick={changeFile("ATPsynthase_8.h5")}>ATP 8</button>
                <button onClick={changeFile("ATPsynthase_9.h5")}>ATP 9</button>
                <button onClick={changeFile("ATPsynthase_10.h5")}>
                    ATP 10
                </button>
                <br />
                <input
                    type="range"
                    min="0"
                    value={currentTime}
                    max={this.state.totalDuration}
                    onChange={this.handleScrubTime}
                />
                <button onClick={this.gotoNextFrame.bind(this)}>
                    Next Frame
                </button>
                <button onClick={this.gotoPreviousFrame.bind(this)}>
                    Previous Frame
                </button>
                <br />
                <select
                    onChange={event =>
                        this.highlightParticleType(event.target.value)
                    }
                >
                    <option value="-1">None</option>
                    {this.state.particleTypeIds.map((id, i) => {
                        return (
                            <option key={id} value={id}>
                                {id}
                            </option>
                        );
                    })}
                </select>
                <button
                    onClick={() =>
                        this.setState({ showMeshes: !this.state.showMeshes })
                    }
                >
                    ShowMeshes
                </button>
                <button
                    onClick={() =>
                        this.setState({ showPaths: !this.state.showPaths })
                    }
                >
                    ShowPaths
                </button>
                <button
                    onClick={() => this.viewerRef.current.switchRenderStyle()}
                >
                    Switch Render
                </button>

                <SimulariumViewer
                    ref={this.viewerRef}
                    height={this.state.height}
                    width={this.state.width}
                    devgui={false}
                    loggerLevel="debug"
                    onTimeChange={this.handleTimeChange.bind(this)}
                    simulariumController={simulariumController}
                    onJsonDataArrived={this.handleJsonMeshData}
                    onTrajectoryFileInfoChanged={this.handleTrajectoryInfo.bind(
                        this
                    )}
                    highlightedParticleType={this.state.highlightId}
                    loadInitialData={true}
                    showMeshes={this.state.showMeshes}
                    showPaths={this.state.showPaths}
                />
            </div>
        );
    }
}

export default Viewer;
