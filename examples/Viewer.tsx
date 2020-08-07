import React from "react";

import SimulariumViewer, { SimulariumController } from "../dist";
import "./style.css";
import { CLIENT_RENEG_WINDOW } from "tls";

const netConnectionSettings = {
    serverIp: "staging-node1-agentviz-backend.cellexplore.net",
    serverPort: 9002,
};

interface ViewerState {
    selectedName: string;
    selectedTag: string;
    pauseOn: number;
    particleTypeNames: string[];
    particleTypeTags: string[];
    currentFrame: number;
    currentTime: number;
    height: number;
    width: number;
    showMeshes: boolean;
    showPaths: boolean;
    timeStep: number;
    totalDuration: number;
    uiDisplayData: UIDisplayData;
}

const simulariumController = new SimulariumController({
    trajectoryPlaybackFile: "ATPsynthase_9.h5",
    netConnectionSettings: netConnectionSettings,
});

let currentFrame = 0;
let currentTime = 0;

const intialState = {
    selectedTag: "UI_VAR_ALL_TAGS",
    selectedName: "UI_VAR_ALL_NAMES",
    pauseOn: -1,
    particleTypeNames: [],
    particleTypeTags: [],
    currentFrame: 0,
    currentTime: 0,
    height: 800,
    width: 800,
    showMeshes: true,
    showPaths: true,
    timeStep: 1,
    totalDuration: 100,
};

class Viewer extends React.Component<{}, ViewerState> {
    private viewerRef: React.RefObject<SimulariumViewer>;

    public constructor(props) {
        super(props);
        this.viewerRef = React.createRef();
        this.handleJsonMeshData = this.handleJsonMeshData.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.playOneFrame = this.playOneFrame.bind(this);
        this.highlightParticleTypeByName = this.highlightParticleTypeByName.bind(this);
        this.highlightParticleTypeByTag = this.highlightParticleTypeByTag.bind(this);
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

    private changeFile(file: string) {
        simulariumController.changeFile(file);
    }

    public handleJsonMeshData(jsonData): void {
        console.log("Mesh JSON Data: ", jsonData);
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

    public highlightParticleTypeByName(name): void {
        this.setState({ selectedName: name });
        this.highlightParticleTypeByTag("UI_VAR_ALL_TAGS");

        if(name === "UI_VAR_ALL_NAMES") {
          this.setState(prevState => ({
            selectionStateInfo: {
              ...prevState.selectionStateInfo,
              highlightedNames: [], // specify none, show all that match tags
            }
          }));
        } else {
          this.setState(prevState => ({
            selectionStateInfo: {
              ...prevState.selectionStateInfo,
              highlightedNames: [name],
            }
          }));
        }
    }

    public highlightParticleTypeByTag(tag): void {
        this.setState({ selectedTag: tag });

        if(tag === "UI_VAR_ALL_TAGS") {
          this.setState(prevState => ({
            selectionStateInfo: {
              ...prevState.selectionStateInfo,
              highlightedTags: [], // specify none -> show all mathcing name
            }
          }));
        } else {
          this.setState(prevState => ({
            selectionStateInfo: {
              ...prevState.selectionStateInfo,
              highlightedTags: [tag],
            }
          }));
        }
    }

    public playOneFrame(): void {
        const frame = Number(document.querySelector("#frame-number").value);
        simulariumController.playFromFrame(frame);

        this.setState({ pauseOn: frame + 1 });
    }

    public handleTrajectoryInfo(data): void {
        console.log("Trajectory info arrived", data);
        this.setState({
            totalDuration: data.totalDuration,
            timeStep: data.timeStepSize,
        });

        currentTime = 0;
        currentFrame = 0;
    }

    public handleScrubTime(event): void {
        simulariumController.gotoTime(event.target.value);
    }

    public handleUIDisplayData(uiDisplayData): void {
        this.setState({ particleTypeNames: uiDisplayData.map(a => a.name) });
        this.setState({ uiDisplayData: uiDisplayData });

        const tagsArrArr = uiDisplayData.map(a => a.display_states.map(b => b.id));
        const allTags = [].concat.apply([], tagsArrArr);
        const uniqueTags = [... new Set(allTags)];
        this.setState({ particleTypeTags: uniqueTags });
    }

    public gotoNextFrame(): void {
        simulariumController.gotoTime(currentTime + this.state.timeStep + 1e-9);
    }

    public gotoPreviousFrame(): void {
        simulariumController.gotoTime(currentTime - this.state.timeStep - 1e-9);
    }

    private tagOptions() {
      let optionsDom = {};

      if(this.state.selectedName === "UI_VAR_ALL_NAMES"){
        optionsDom = this.state.particleTypeTags.map((id, i) => {
            return (
                <option key={id} value={id}>
                    {id}
                </option>
            );
        });
      } else {
        let matches = this.state.uiDisplayData.filter(entry => {
          return entry.name === this.state.selectedName
        });

        if(!matches.length > 0) { return; }

        optionsDom = matches[0].display_states.map((state, i) => {
            return (
                <option key={state.id} value={state.id}>
                    {state.id}
                </option>
            );
        });
      }

      return optionsDom;
    }

    public render(): JSX.Element {
        return (
            <div className="container" style={{ height: "90%", width: "75%" }}>
                <button onClick={() => simulariumController.start()}>
                    Start
                </button>
                <button onClick={() => simulariumController.pause()}>
                    Pause
                </button>
                <button onClick={() => simulariumController.resume()}>
                    Resume
                </button>
                <button onClick={() => simulariumController.stop()}>
                    stop
                </button>
                <button onClick={() => this.changeFile("test_traj1.h5")}>
                    TEST
                </button>
                <button
                    onClick={() =>
                        this.changeFile("microtubules_v2_shrinking.h5")
                    }
                >
                    MTub
                </button>
                <button onClick={() => this.changeFile("aster.cmo")}>
                    Aster
                </button>
                <button onClick={() => this.changeFile("actin34_0.h5")}>
                    Actin 34
                </button>
                <button onClick={() => this.changeFile("microtubules30_1.h5")}>
                    MT 30
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_1.h5")}>
                    ATP 1
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_2.h5")}>
                    ATP 2
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_3.h5")}>
                    ATP 3
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_4.h5")}>
                    ATP 4
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_5.h5")}>
                    ATP 5
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_6.h5")}>
                    ATP 6
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_7.h5")}>
                    ATP 7
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_8.h5")}>
                    ATP 8
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_9.h5")}>
                    ATP 9
                </button>
                <button onClick={() => this.changeFile("ATPsynthase_10.h5")}>
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
                        this.highlightParticleTypeByName(event.target.value)
                    }
                    value={this.state.selectedName}
                >
                    <option value="UI_VAR_ALL_NAMES">All Types</option>
                    {this.state.particleTypeNames.map((id, i) => {
                        return (
                            <option key={id} value={id}>
                                {id}
                            </option>
                        );
                    })}
                </select>
                <select
                    onChange={event =>
                        this.highlightParticleTypeByTag(event.target.value)
                    }
                    value={this.state.selectedTag}
                >
                    <option value="UI_VAR_ALL_TAGS">All Tags</option>
                    {this.tagOptions()}
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
                    selectionStateInfo={this.state.selectionStateInfo}
                    onUIDisplayDataChanged={this.handleUIDisplayData.bind(this)}
                    loadInitialData={true}
                    showMeshes={this.state.showMeshes}
                    showPaths={this.state.showPaths}
                />
            </div>
        );
    }
}

export default Viewer;
