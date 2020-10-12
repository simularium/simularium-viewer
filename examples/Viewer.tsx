import React from "react";
import type { UIDisplayData, SelectionStateInfo } from "../type-declarations";

import SimulariumViewer, {
    SimulariumController,
    RenderStyle,
    SimulariumFileFormat,
    VisDataFrame,
} from "../src";

import "./style.css";
import { isEqual } from "lodash";

const netConnectionSettings = {
    serverIp: "staging-node1-agentviz-backend.cellexplore.net",
    serverPort: 9002,
};

// Typescript's File definition is missing this function
//  which is part of the HTML standard on all browsers
//  and needed below
interface FileHTML extends File {
    text(): Promise<string>;
}

interface ViewerState {
    renderStyle: RenderStyle;
    selectedName: string;
    selectedTag: string;
    pauseOn: number;
    particleTypeNames: string[];
    particleTypeTags: string[];
    currentFrame: number;
    currentTime: number;
    height: number;
    width: number;
    selectionStateInfo: SelectionStateInfo;
    hideAllAgents: boolean;
    showPaths: boolean;
    timeStep: number;
    totalDuration: number;
    uiDisplayData: UIDisplayData;
}

const simulariumController = new SimulariumController({});
let playbackFile = "ATPsynthase_9.h5";

let currentFrame = 0;
let currentTime = 0;

const initialState = {
    renderStyle: RenderStyle.MOLECULAR,
    pauseOn: -1,
    particleTypeNames: [],
    particleTypeTags: [],
    currentFrame: 0,
    currentTime: 0,
    height: 700,
    width: 800,
    hideAllAgents: false,
    showPaths: true,
    timeStep: 1,
    totalDuration: 100,
    uiDisplayData: [],
    selectionStateInfo: {
        highlightedAgents: [],
        hiddenAgents: [],
    },
};

class Viewer extends React.Component<{}, ViewerState> {
    private viewerRef: React.RefObject<SimulariumViewer>;

    public constructor(props) {
        super(props);
        this.viewerRef = React.createRef();
        this.handleJsonMeshData = this.handleJsonMeshData.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.state = initialState;
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => {
            const container = document.querySelector(".container");

            const height = container.clientHeight;
            const width = container.clientWidth;
            this.setState({ height, width });
        });
        const viewerContainer = document.querySelector(".viewer-container");
        if (viewerContainer) {
            viewerContainer.addEventListener("drop", this.onDrop);
            viewerContainer.addEventListener("dragover", this.onDragOver);
        }
    }

    public onDragOver = (e: Event): void => {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
    };

    public onDrop = (e: Event): void => {
        this.onDragOver(e);
        const event = e as DragEvent;
        const input = event.target as HTMLInputElement;
        const data: DataTransfer = event.dataTransfer as DataTransfer;

        const files: FileList = input.files || data.files;
        const filesArr: FileHTML[] = Array.from(files) as FileHTML[];

        Promise.all(
            filesArr.map((file) =>
                file
                    .text()
                    .then((text) => JSON.parse(text) as SimulariumFileFormat)
            )
        ).then((parsedFiles) => {
            const simulariumFile = parsedFiles[0];
            const fileName = filesArr[0].name;
            simulariumController
                .changeFile(fileName, true, simulariumFile)
                .catch((error) => {
                    console.log(error.htmlData)
                    window.alert(`Error loading file: ${error.message}`);
                });
        });
    };

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

    public turnAgentsOnOff(nameToToggle: string) {
        let currentHiddenAgents = this.state.selectionStateInfo.hiddenAgents;
        console.log(currentHiddenAgents);
        let nextHiddenAgents = [];
        if (currentHiddenAgents.some((a) => a.name === nameToToggle)) {
            nextHiddenAgents = currentHiddenAgents.filter(
                (hiddenAgent) => hiddenAgent.name !== nameToToggle
            );
        } else {
            nextHiddenAgents = [...currentHiddenAgents, {"name": nameToToggle, "tags": [], },];
        }
        console.log(nextHiddenAgents);
        this.setState({
            ...this.state,
            selectionStateInfo: {
                ...this.state.selectionStateInfo,
                hiddenAgents: nextHiddenAgents,
            },
        });
    }

    public handleTrajectoryInfo(data): void {
        console.log("Trajectory info arrived", data);
        const totalDuration = data.totalSteps * data.timeStepSize;
        this.setState({
            totalDuration,
            timeStep: data.timeStepSize,
        });

        currentTime = 0;
        currentFrame = 0;
    }

    public handleScrubTime(event): void {
        simulariumController.gotoTime(event.target.value);
    }

    public handleUIDisplayData(uiDisplayData: UIDisplayData): void {
        console.log("uiDisplayData", uiDisplayData);
        const allTags = uiDisplayData.reduce(
            (fullArray: string[], subarray) => {
                fullArray = [
                    ...fullArray,
                    ...subarray.displayStates.map((b) => b.id),
                ];
                return fullArray;
            },
            []
        );
        const uniqueTags: string[] = [...new Set(allTags)];
        if (isEqual(uiDisplayData, this.state.uiDisplayData)) {
            return;
        }
        this.setState({
            particleTypeNames: uiDisplayData.map((a) => a.name),
            uiDisplayData: uiDisplayData,
            particleTypeTags: uniqueTags,
            selectionStateInfo: initialState.selectionStateInfo,
        });
    }

    public gotoNextFrame(): void {
        simulariumController.gotoTime(currentTime + this.state.timeStep + 1e-9);
    }

    public gotoPreviousFrame(): void {
        simulariumController.gotoTime(currentTime - this.state.timeStep - 1e-9);
    }

    private configureAndStart() {
        simulariumController.configureNetwork(netConnectionSettings);
        simulariumController.changeFile(playbackFile);
        simulariumController.start();
    }

    public render(): JSX.Element {
        return (
            <div className="container" style={{ height: "90%", width: "75%" }}>
                <button onClick={() => this.configureAndStart()}>Start</button>
                <button onClick={() => simulariumController.pause()}>
                    Pause
                </button>
                <button onClick={() => simulariumController.resume()}>
                    Resume
                </button>
                <button onClick={() => simulariumController.stop()}>
                    stop
                </button>
                <select
                    onChange={(event) => {
                        playbackFile = event.target.value;
                    }}
                    defaultValue={playbackFile}
                >
                    <option value="test_traj1.h5">TEST</option>
                    <option value="microtubules_v2_shrinking.h5">M Tub</option>
                    <option value="aster.cmo">Aster</option>
                    <option value="actin34_0.h5">Actin 34</option>
                    <option value="microtubules30_1.h5">MT 30</option>
                    <option value="ATPsynthase_1.h5">ATP 1</option>
                    <option value="ATPsynthase_2.h5">ATP 2</option>
                    <option value="ATPsynthase_3.h5">ATP 3</option>
                    <option value="ATPsynthase_4.h5">ATP 4</option>
                    <option value="ATPsynthase_5.h5">ATP 5</option>
                    <option value="ATPsynthase_6.h5">ATP 6</option>
                    <option value="ATPsynthase_7.h5">ATP 7</option>
                    <option value="ATPsynthase_8.h5">ATP 8</option>
                    <option value="ATPsynthase_9.h5">ATP 9</option>
                    <option value="ATPsynthase_10.h5">ATP 10</option>
                </select>
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
                {this.state.particleTypeNames.map((id, i) => {
                    return (
                        <React.Fragment key={id}>
                            <label htmlFor={id}>{id}</label>
                            <input
                                type="checkbox"
                                onClick={(event) =>
                                    this.turnAgentsOnOff(event.target.value)
                                }
                                value={id}
                                defaultChecked={true}
                            />
                        </React.Fragment>
                    );
                })}
                <button
                    onClick={() =>
                        this.setState({
                            hideAllAgents: !this.state.hideAllAgents,
                        })
                    }
                >
                    {this.state.hideAllAgents ? "Show all" : "Hide all"}
                </button>
                <button
                    onClick={() =>
                        this.setState({ showPaths: !this.state.showPaths })
                    }
                >
                    ShowPaths
                </button>
                <button
                    onClick={() =>
                        this.setState({
                            renderStyle:
                                this.state.renderStyle === RenderStyle.GENERIC
                                    ? RenderStyle.MOLECULAR
                                    : RenderStyle.GENERIC,
                        })
                    }
                >
                    Switch Render
                </button>
                <button onClick={() => simulariumController.resetCamera()}>
                    Reset camera
                </button>
                <button onClick={() => simulariumController.centerCamera()}>
                    center camera
                </button>
                <button onClick={() => simulariumController.reOrientCamera()}>
                    starting orientation
                </button>
                <div className="viewer-container">
                    <SimulariumViewer
                        ref={this.viewerRef}
                        renderStyle={this.state.renderStyle}
                        height={this.state.height}
                        width={this.state.width}
                        loggerLevel="debug"
                        onTimeChange={this.handleTimeChange.bind(this)}
                        simulariumController={simulariumController}
                        onJsonDataArrived={this.handleJsonMeshData}
                        onTrajectoryFileInfoChanged={this.handleTrajectoryInfo.bind(
                            this
                        )}
                        selectionStateInfo={this.state.selectionStateInfo}
                        onUIDisplayDataChanged={this.handleUIDisplayData.bind(
                            this
                        )}
                        loadInitialData={true}
                        hideAllAgents={this.state.hideAllAgents}
                        showPaths={this.state.showPaths}
                        onError={(error) => window.alert(error)}
                    />
                </div>
            </div>
        );
    }
}

export default Viewer;
