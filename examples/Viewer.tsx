import React from "react";
import type {
    UIDisplayData,
    SelectionStateInfo,
} from "../src/simularium/SelectionInterface";

import SimulariumViewer, {
    SimulariumController,
    RenderStyle,
    SimulariumFileFormat,
} from "../src";
import "./style.css";
import { isEqual } from "lodash";

const netConnectionSettings = {
    serverIp: "staging-node1-agentviz-backend.cellexplore.net",
    serverPort: 9002,
};

let playbackFile = "medyan_paper_M:A_0.675.simularium";
let queryStringFile = "";
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("file")) {
    queryStringFile = urlParams.get("file");
    playbackFile = queryStringFile;
}

// Typescript's File definition is missing this function
//  which is part of the HTML standard on all browsers
//  and needed below
interface FileHTML extends File {
    text(): Promise<string>;
}

const agentColors = [
    "#fee34d",
    "#f7b232",
    "#bf5736",
    "#94a7fc",
    "#ce8ec9",
    "#58606c",
    "#0ba345",
    "#9267cb",
    "#81dbe6",
    "#bd7800",
    "#bbbb99",
    "#5b79f0",
    "#89a500",
    "#da8692",
    "#418463",
    "#9f516c",
    "#00aabf",
];

interface ViewerState {
    renderStyle: RenderStyle;
    pauseOn: number;
    particleTypeNames: string[];
    particleTypeTags: string[];
    currentFrame: number;
    currentTime: number;
    height: number;
    width: number;
    selectionStateInfo: SelectionStateInfo;
    hideAllAgents: boolean;
    agentColors: (number | string)[];
    showPaths: boolean;
    timeStep: number;
    totalDuration: number;
    uiDisplayData: UIDisplayData;
}

const simulariumController = new SimulariumController({});

let currentFrame = 0;
let currentTime = 0;

const initialState = {
    renderStyle: RenderStyle.WEBGL2_PREFERRED,
    pauseOn: -1,
    particleTypeNames: [],
    particleTypeTags: [],
    currentFrame: 0,
    currentTime: 0,
    height: 700,
    width: 800,
    hideAllAgents: false,
    agentColors: agentColors,
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
                .changeFile({ simulariumFile }, fileName)
                .catch((error) => {
                    console.log(error.htmlData);
                    window.alert(`Error loading file: ${error.message}`);
                });
        });
    };

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
            nextHiddenAgents = [
                ...currentHiddenAgents,
                { name: nameToToggle, tags: [] },
            ];
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

    public turnAgentHighlightsOnOff(nameToToggle: string) {
        let currentHighlightedAgents = this.state.selectionStateInfo
            .highlightedAgents;
        console.log(currentHighlightedAgents);
        let nextHighlightedAgents = [];
        if (currentHighlightedAgents.some((a) => a.name === nameToToggle)) {
            nextHighlightedAgents = currentHighlightedAgents.filter(
                (hiddenAgent) => hiddenAgent.name !== nameToToggle
            );
        } else {
            nextHighlightedAgents = [
                ...currentHighlightedAgents,
                { name: nameToToggle, tags: [] },
            ];
        }
        console.log(nextHighlightedAgents);
        this.setState({
            ...this.state,
            selectionStateInfo: {
                ...this.state.selectionStateInfo,
                highlightedAgents: nextHighlightedAgents,
            },
        });
    }

    public handleTrajectoryInfo(data): void {
        console.log("Trajectory info arrived", data);
        // NOTE: Currently incorrectly assumes initial time of 0
        const totalDuration = (data.totalSteps - 1) * data.timeStepSize;
        this.setState({
            totalDuration,
            timeStep: data.timeStepSize,
            currentFrame: 0,
            currentTime: 0,
        });
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
        simulariumController.gotoTime(this.state.currentTime + this.state.timeStep);
    }

    public gotoPreviousFrame(): void {
        simulariumController.gotoTime(this.state.currentTime - this.state.timeStep);
    }

    private configureAndLoad() {
        simulariumController.configureNetwork(netConnectionSettings);
        if (playbackFile === "TEST_POINTS") {
            simulariumController.changeFile(
                {
                    clientSimulatorParams: {
                        name: "my test sim",
                        type: "POINTSIM",
                        nPoints: 1000,
                        nTypes: 4,
                    },
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_FIBERS") {
            simulariumController.changeFile(
                {
                    clientSimulatorParams: {
                        name: "my test sim",
                        type: "CURVESIM",
                        nCurves: 1000,
                        nTypes: 4,
                    },
                },
                playbackFile
            );
        } else {
            simulariumController.changeFile(
                {
                    netConnectionSettings,
                },
                playbackFile
            );
        }
    }

    public render(): JSX.Element {
        return (
            <div className="container" style={{ height: "90%", width: "75%" }}>
                <select
                    onChange={(event) => {
                        playbackFile = event.target.value;
                    }}
                    defaultValue={playbackFile}
                >
                    <option value={queryStringFile}>{queryStringFile}</option>
                    <option value="medyan_paper_M:A_0.675.simularium">
                        medyan test
                    </option>
                    <option value="actin012_3.h5">Actin 12_3</option>
                    <option value="listeria_rocketbugs_normal_fine_2_filtered.simularium">
                        listeria 01
                    </option>
                    <option value="kinesin002_01.h5">kinesin 002</option>
                    <option value="microtubules038_10.h5">MT 38</option>
                    <option value="test_traj1.h5">TEST</option>
                    <option value="microtubules_v2_shrinking.h5">M Tub</option>
                    <option value="aster.cmo">Aster</option>
                    <option value="actin34_0.h5">Actin 34</option>
                    <option value="microtubules30_1.h5">MT 30</option>
                    <option value="endocytosis.simularium">Endocytosis</option>
                    <option value="ATPsynthase_2.h5">ATP 2</option>
                    <option value="ATPsynthase_3.h5">ATP 3</option>
                    <option value="ATPsynthase_4.h5">ATP 4</option>
                    <option value="ATPsynthase_5.h5">ATP 5</option>
                    <option value="ATPsynthase_6.h5">ATP 6</option>
                    <option value="ATPsynthase_7.h5">ATP 7</option>
                    <option value="ATPsynthase_8.h5">ATP 8</option>
                    <option value="ATPsynthase_9.h5">ATP 9</option>
                    <option value="ATPsynthase_10.h5">ATP 10</option>
                    <option value="TEST_FIBERS">TEST FIBERS</option>
                    <option value="TEST_POINTS">TEST POINTS</option>
                </select>
                <button onClick={() => this.configureAndLoad()}>
                    Load model
                </button>
                <button onClick={() => simulariumController.resume()}>
                    Play
                </button>
                <button onClick={() => simulariumController.pause()}>
                    Pause
                </button>
                <button onClick={() => simulariumController.stop()}>
                    stop
                </button>
                <button onClick={() => simulariumController.clearFile()}>
                    Clear
                </button>

                <br />
                <button onClick={this.gotoPreviousFrame.bind(this)}>
                    Previous Frame
                </button>
                <button onClick={this.gotoNextFrame.bind(this)}>
                    Next Frame
                </button>
                <input
                    name="slider"
                    type="range"
                    min={0}
                    step={this.state.timeStep}
                    value={this.state.currentTime}
                    max={this.state.totalDuration}
                    onChange={this.handleScrubTime}
                />
                <label htmlFor="slider">
                    {this.state.currentTime} / {this.state.totalDuration}
                </label>
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
                            <input
                                type="checkbox"
                                onClick={(event) =>
                                    this.turnAgentHighlightsOnOff(
                                        event.target.value
                                    )
                                }
                                value={id}
                                defaultChecked={false}
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
                                this.state.renderStyle === RenderStyle.WEBGL1_FALLBACK
                                    ? RenderStyle.WEBGL2_PREFERRED
                                    : RenderStyle.WEBGL1_FALLBACK,
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
                <button onClick={() => simulariumController.zoomIn()}>+</button>
                <button onClick={() => simulariumController.zoomOut()}>
                    -
                </button>
                <span>
                    Tick interval length:{" "}
                    {simulariumController.tickIntervalLength}
                </span>
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
                        agentColors={this.state.agentColors}
                        hideAllAgents={this.state.hideAllAgents}
                        showPaths={this.state.showPaths}
                        onError={(error) => window.alert(error)}
                        backgroundColor={[0, 0, 0]}
                    />
                </div>
            </div>
        );
    }
}

export default Viewer;
