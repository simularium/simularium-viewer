import React from "react";
import { isEqual, findIndex, map, reduce } from "lodash";

import type {
    ISimulariumFile,
    UIDisplayData,
    SelectionStateInfo,
    SelectionEntry,
} from "../../type-declarations";
import { TrajectoryType } from "../../src/constants";
import SimulariumViewer, {
    SimulariumController,
    RenderStyle,
    loadSimulariumFile,
    FrontEndError,
    ErrorLevel,
    NetConnectionParams,
    TrajectoryFileInfo,
} from "../../src/index";

/**
 * NOTE: if you are debugging an import/build issue
 * on the front end, you may need to switch to the
 * following import statements to reproduce the issue
 * here.
 */
// import SimulariumViewer, {
//     SimulariumController,
//     RenderStyle,
//     loadSimulariumFile,
//     FrontEndError,
//     ErrorLevel,
// } from "../es";
import "../../style/style.css";
import ColorPicker from "./components/ColorPicker";
import {
    SMOLDYN_TEMPLATE,
    UI_BASE_TYPES,
    UI_CUSTOM_TYPES,
    UI_TEMPLATE_DOWNLOAD_URL_ROOT,
    UI_TEMPLATE_URL_ROOT,
} from "./api-settings";
import ConversionForm from "./ConversionForm";
import {
    agentColors,
    PLAYBACK_OPTIONS,
    simulatorConfigurations,
} from "./constants";
import PlaybackControls from "./components/PlaybackControls";
import { InputParams } from "tweakpane";
import {
    BaseType,
    CustomType,
    SimulariumFile,
    SimulatorConfiguration,
} from "./types";
import Download from "./components/Download";
import CameraControls from "./components/CameraControls";

let playbackFile = "TEST_LIVEMODE_API";
let queryStringFile = "";
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("file")) {
    queryStringFile = urlParams.get("file") || "";
    playbackFile = queryStringFile;
}

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
    agentColors: number[] | string[];
    showPaths: boolean;
    timeStep: number;
    totalDuration: number;
    uiDisplayData: UIDisplayData;
    filePending: {
        type: TrajectoryType;
        template: { [key: string]: any };
        templateData: { [key: string]: any };
    } | null;
    simulariumFile: SimulariumFile | null;
    serverHealthy: boolean;
}

const controller = new SimulariumController({});

let currentFrame = 0;
let currentTime = 0;

const initialState: ViewerState = {
    renderStyle: RenderStyle.WEBGL2_PREFERRED,
    pauseOn: -1,
    particleTypeNames: [],
    particleTypeTags: [],
    currentFrame: 0,
    currentTime: 0,
    height: 700,
    width: 1200,
    hideAllAgents: false,
    agentColors: agentColors,
    showPaths: true,
    timeStep: 1,
    totalDuration: 100,
    uiDisplayData: [],
    selectionStateInfo: {
        highlightedAgents: [],
        hiddenAgents: [],
        colorChange: null,
    },
    filePending: null,
    simulariumFile: null,
    serverHealthy: false,
};

class Viewer extends React.Component<InputParams, ViewerState> {
    private viewerRef: React.RefObject<SimulariumViewer>;
    private panMode = false;
    private focusMode = true;
    private orthoMode = false;
    private netConnectionSettings: NetConnectionParams;

    public constructor(props: InputParams) {
        super(props);
        this.viewerRef = React.createRef();
        this.handleJsonMeshData = this.handleJsonMeshData.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.loadFile = this.loadFile.bind(this);
        this.clearPendingFile = this.clearPendingFile.bind(this);
        this.convertFile = this.convertFile.bind(this);
        this.onHealthCheckResponse = this.onHealthCheckResponse.bind(this);
        this.state = initialState;

        if (props.localBackendServer) {
            this.netConnectionSettings = {
                serverIp: "0.0.0.0",
                serverPort: 8765,
                useOctopus: props.useOctopus,
                secureConnection: props.useOctopus,
            };
        } else if (props.useOctopus) {
            this.netConnectionSettings = {
                serverIp: "18.223.108.15",
                serverPort: 8765,
                useOctopus: true,
                secureConnection: true,
            };
        } else {
            this.netConnectionSettings = {
                serverIp: "staging-node1-agentviz-backend.cellexplore.net",
                serverPort: 9002,
                secureConnection: true,
                useOctopus: false,
            };
        }
    }

    public componentDidMount(): void {
        window.addEventListener("resize", () => {
            const container = document.querySelector(".container");
            if (!container) {
                return;
            }
            const height = container.clientHeight;
            const width = container.clientWidth;
            this.setState({ height, width });
        });
        const viewerContainer = document.querySelector(".viewer-container");
        if (viewerContainer) {
            viewerContainer.addEventListener("drop", this.onDrop);
            viewerContainer.addEventListener("dragover", this.onDragOver);
        }
        this.configureAndLoad();
    }

    public onDragOver = (e: Event): void => {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        e.preventDefault();
    };

    public onError = (error: FrontEndError) => {
        if (error.level === ErrorLevel.ERROR) {
            window.alert(
                `ERROR, something is broken: ${error.message} ${error.htmlData}`
            );
        } else if (error.level === ErrorLevel.WARNING) {
            window.alert(
                `User warning, but not terrible:  ${error.message} ${error.htmlData}`
            );
        } else if (error.level === ErrorLevel.INFO) {
            console.log(`Just for your info. ${error.message}`);
        } else {
            console.warn(
                `This error didn't have a level sent with it: ${error.message}. Should probably be converted to a FrontEndError`
            );
        }
    };

    public onDrop = (e: Event): void => {
        this.onDragOver(e);
        const event = e as DragEvent;
        const input = event.target as HTMLInputElement;
        const data: DataTransfer = event.dataTransfer as DataTransfer;

        const files: FileList = input.files || data.files;
        const filesArr: File[] = Array.from(files) as File[];

        try {
            // Try to identify the simularium file.
            // Put all the other files as text based geoAssets.
            const simulariumFileIndex = findIndex(filesArr, (file) =>
                file.name.includes(".simularium")
            );
            Promise.all(
                filesArr.map(
                    (element, index): Promise<string | ISimulariumFile> => {
                        if (index !== simulariumFileIndex) {
                            // is async call
                            return element.text();
                        } else {
                            return loadSimulariumFile(element);
                        }
                    }
                )
            )
                .then((parsedFiles: (ISimulariumFile | string)[]) => {
                    const simulariumFile = parsedFiles[
                        simulariumFileIndex
                    ] as ISimulariumFile;
                    this.setState({
                        simulariumFile: {
                            data: simulariumFile,
                            name: filesArr[simulariumFileIndex].name,
                        },
                    });
                    // build the geoAssets as mapping name-value pairs:
                    const geoAssets = filesArr.reduce((acc, cur, index) => {
                        if (index !== simulariumFileIndex) {
                            acc[cur.name] = parsedFiles[index];
                        }
                        return acc;
                    }, {});
                    const fileName = filesArr[simulariumFileIndex].name;
                    this.loadFile(simulariumFile, fileName, geoAssets);
                })
                .catch((error) => {
                    this.onError(error);
                });
        } catch (error: any) {
            return this.onError(new FrontEndError(error.message));
        }
    };

    public loadFromUrl(url): void {
        fetch(url)
            .then((item: Response) => {
                return item.blob();
            })
            .then((blob: Blob) => {
                return loadSimulariumFile(blob);
            })
            .then((simulariumFile: ISimulariumFile) => {
                const fileName = url;
                this.setState({
                    simulariumFile: { data: simulariumFile, name: fileName },
                });

                this.loadFile(simulariumFile, fileName).catch((error) => {
                    console.log("Error loading file", error);
                    window.alert(`Error loading file: ${error.message}`);
                });
            });
    }

    public async loadUiTemplates(): Promise<{
        [key: string]: BaseType | CustomType;
    }> {
        const baseTypes = await fetch(
            `${UI_TEMPLATE_DOWNLOAD_URL_ROOT}/${UI_BASE_TYPES}`
        ).then((data) => data.json());
        const customTypes = await fetch(
            `${UI_TEMPLATE_URL_ROOT}/${UI_CUSTOM_TYPES}`
        )
            .then((data) => data.json())
            .then((fileRefs) =>
                Promise.all(
                    map(fileRefs, (ref) =>
                        fetch(ref.download_url).then((data) => data.json())
                    )
                )
            );
        const typeMap: {
            [key: string]: BaseType | CustomType;
        } = reduce(
            customTypes,
            (acc, cur: CustomType) => {
                //CustomType always has just one
                const key = Object.keys(cur)[0];
                acc[key] = cur[key];
                return acc;
            },
            {}
        );
        baseTypes["base_types"].forEach((type) => {
            typeMap[type.id] = { ...type, isBaseType: true };
        });
        return typeMap;
    }

    public onHealthCheckResponse() {
        this.setState({ serverHealthy: true });
    }

    public async loadSmoldynFile() {
        const smoldynTemplate = await fetch(
            `${UI_TEMPLATE_DOWNLOAD_URL_ROOT}/${SMOLDYN_TEMPLATE}`
        ).then((data) => data.json());
        const templateMap = await this.loadUiTemplates();

        this.setState({
            filePending: {
                type: TrajectoryType.SMOLDYN,
                template: smoldynTemplate.smoldyn_data,
                templateData: templateMap,
            },
            serverHealthy: false,
        });
        controller.checkServerHealth(
            this.onHealthCheckResponse,
            this.netConnectionSettings
        );
    }

    public convertFile(obj: Record<string, any>, fileType: TrajectoryType) {
        controller
            .convertAndLoadTrajectory(this.netConnectionSettings, obj, fileType)
            .then(() => {
                this.clearPendingFile();
            })
            .catch((err) => {
                console.error(err);
            });
    }

    public clearPendingFile() {
        this.setState({ filePending: null });
    }

    public loadFile(trajectoryFile, fileName, geoAssets?) {
        const simulariumFile = fileName.includes(".simularium")
            ? trajectoryFile
            : null;
        // if (!fileName.includes(".simularium")) {
        //     return new
        // }
        return controller
            .handleFileChange(simulariumFile, fileName, geoAssets)
            .catch(console.log);
    }

    public handleJsonMeshData(jsonData): void {
        console.log("Mesh JSON Data: ", jsonData);
    }

    public handleTimeChange(timeData): void {
        currentFrame = timeData.frameNumber;
        currentTime = timeData.time;
        this.setState({ currentFrame, currentTime });
        if (this.state.pauseOn === currentFrame) {
            controller.pause();
            this.setState({ pauseOn: -1 });
        }
    }

    public turnAgentsOnOff(nameToToggle: string) {
        let currentHiddenAgents = this.state.selectionStateInfo.hiddenAgents;
        let nextHiddenAgents: SelectionEntry[] = [];
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
        this.setState({
            ...this.state,
            selectionStateInfo: {
                ...this.state.selectionStateInfo,
                hiddenAgents: nextHiddenAgents,
            },
        });
    }

    public turnAgentHighlightsOnOff(nameToToggle: string) {
        let currentHighlightedAgents =
            this.state.selectionStateInfo.highlightedAgents;
        let nextHighlightedAgents: SelectionEntry[] = [];
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
        this.setState({
            ...this.state,
            selectionStateInfo: {
                ...this.state.selectionStateInfo,
                highlightedAgents: nextHighlightedAgents,
            },
        });
    }

    public handleTrajectoryInfo(data: TrajectoryFileInfo): void {
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

    private translateAgent() {
        controller.sendUpdate({
            data: {
                agents: {
                    "1": {
                        _updater: "accumulate",
                        position: [0.45, 0, 0],
                    },
                    "2": {
                        _updater: "accumulate",
                        position: [0, 0.45, 0],
                    },
                },
            },
        });
    }

    private configureAndLoad() {
        controller.configureNetwork(this.netConnectionSettings);

        if (playbackFile.startsWith("http")) {
            return this.loadFromUrl(playbackFile);
        }

        const config: SimulatorConfiguration =
            simulatorConfigurations[playbackFile];

        if (config) {
            if (config.action) config.action(controller); // todo the only config with an action currently takes in the controller...
            controller.changeFile(
                {
                    clientSimulator: config.clientSimulator,
                },
                playbackFile
            );
        } else {
            this.setState({
                simulariumFile: { name: playbackFile, data: null },
            });
            controller.changeFile(
                {
                    netConnectionSettings: this.netConnectionSettings,
                },
                playbackFile
            );
        }
    }

    public updateAgentColorArray = (color) => {
        const agentColors = [...this.state.agentColors, color] as string[];
        this.setState({ agentColors });
    };

    public setColorSelectionInfo = (colorChange) => {
        this.setState({
            ...this.state,
            selectionStateInfo: {
                hiddenAgents: this.state.selectionStateInfo.hiddenAgents,
                highlightedAgents:
                    this.state.selectionStateInfo.highlightedAgents,
                colorChange: colorChange,
            },
        });
    };

    public renderStyleHandler = (): void => {
        this.setState({
            renderStyle:
                this.state.renderStyle === RenderStyle.WEBGL1_FALLBACK
                    ? RenderStyle.WEBGL2_PREFERRED
                    : RenderStyle.WEBGL1_FALLBACK,
        });
    };

    public showPathsHandler = (): void => {
        this.setState({ showPaths: !this.state.showPaths });
    };

    public panModeHandler = (): void => {
        this.panMode = !this.panMode;
        controller.setPanningMode(this.panMode);
    };

    public focusModeHandler = (): void => {
        this.focusMode = !this.focusMode;
        controller.setFocusMode(this.focusMode);
    };

    public cameraTypeHandler = (): void => {
        this.orthoMode = !this.orthoMode;
        controller.setCameraType(this.orthoMode);
    };

    public render(): JSX.Element {
        if (this.state.filePending) {
            const fileType = this.state.filePending.type;
            return (
                <ConversionForm
                    {...this.state.filePending}
                    submitFile={(obj) => this.convertFile(obj, fileType)}
                    onReturned={this.clearPendingFile}
                    submitDisabled={!this.state.serverHealthy}
                />
            );
        }
        return (
            <div className="container" style={{ height: "90%", width: "75%" }}>
                <select
                    onChange={(event) => {
                        controller.pause();
                        playbackFile = event.target.value;
                        this.configureAndLoad();
                    }}
                    defaultValue={playbackFile}
                >
                    <option value={queryStringFile}>{queryStringFile}</option>
                    {PLAYBACK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <button onClick={() => this.translateAgent()}>
                    TranslateAgent
                </button>
                <button onClick={() => controller.clearFile()}>Clear</button>
                <button onClick={() => this.loadSmoldynFile()}>
                    Load a smoldyn trajectory
                </button>
                <br />
                <PlaybackControls
                    controller={controller}
                    timeStep={this.state.timeStep}
                    currentTime={this.state.currentTime}
                    totalDuration={this.state.totalDuration}
                />
                <br />
                {this.state.particleTypeNames.map((id, i) => {
                    return (
                        <React.Fragment key={id}>
                            <label htmlFor={id}>{id}</label>
                            <input
                                type="checkbox"
                                onChange={(event) =>
                                    this.turnAgentsOnOff(
                                        (event.target as HTMLInputElement).value
                                    )
                                }
                                value={id}
                                checked={
                                    this.state.selectionStateInfo.hiddenAgents.find(
                                        (element) => element.name === id
                                    ) === undefined
                                }
                            />
                            <input
                                type="checkbox"
                                onChange={(event) =>
                                    this.turnAgentHighlightsOnOff(
                                        (event.target as HTMLInputElement).value
                                    )
                                }
                                value={id}
                                defaultChecked={false}
                            />
                        </React.Fragment>
                    );
                })}
                <button
                    onClick={() => {
                        let hiddenAgents: { name: string; tags: string[] }[] =
                            [];
                        if (!this.state.hideAllAgents) {
                            hiddenAgents = this.state.particleTypeNames.map(
                                (name) => {
                                    return { name: name, tags: [] };
                                }
                            );
                        }
                        this.setState({
                            ...this.state,
                            hideAllAgents: !this.state.hideAllAgents,
                            selectionStateInfo: {
                                ...this.state.selectionStateInfo,
                                hiddenAgents: hiddenAgents,
                            },
                        });
                    }}
                >
                    {this.state.hideAllAgents ? "Show all" : "Hide all"}
                </button>
                <br />
                <CameraControls
                    controller={controller}
                    showPaths={this.showPathsHandler}
                    setRenderStyle={this.renderStyleHandler}
                    setPanMode={this.panModeHandler}
                    setFocusMode={this.focusModeHandler}
                    setCameraMode={this.cameraTypeHandler}
                />
                <br />
                <button
                    onClick={() =>
                        controller.getMetrics(this.netConnectionSettings)
                    }
                >
                    Get available metrics
                </button>
                <Download simulariumFile={this.state.simulariumFile} />
                <button
                    onClick={() =>
                        controller.getPlotData(
                            this.netConnectionSettings,
                            // TODO: allow user to select metrics based on results from
                            // the getMetrics() call
                            [
                                {
                                    plotType: "scatter",
                                    metricsIdx: 0,
                                    metricsIdy: 2,
                                    scatterPlotMode: "lines",
                                },
                                {
                                    plotType: "histogram",
                                    metricsIdx: 3,
                                },
                            ]
                        )
                    }
                >
                    Get plot data
                </button>
                <span>
                    Tick interval length: {controller.tickIntervalLength}
                </span>
                <br></br>
                <ColorPicker
                    uiDisplayData={this.state.uiDisplayData}
                    particleTypeNames={this.state.particleTypeNames}
                    agentColors={this.state.agentColors}
                    updateAgentColorArray={this.updateAgentColorArray}
                    setColorSelectionInfo={this.setColorSelectionInfo}
                />
                <div className="viewer-container">
                    <SimulariumViewer
                        ref={this.viewerRef}
                        renderStyle={this.state.renderStyle}
                        height={this.state.height}
                        width={this.state.width}
                        loggerLevel="debug"
                        onTimeChange={this.handleTimeChange.bind(this)}
                        simulariumController={controller}
                        onJsonDataArrived={this.handleJsonMeshData}
                        showCameraControls={false}
                        onTrajectoryFileInfoChanged={this.handleTrajectoryInfo.bind(
                            this
                        )}
                        selectionStateInfo={this.state.selectionStateInfo}
                        onUIDisplayDataChanged={this.handleUIDisplayData.bind(
                            this
                        )}
                        loadInitialData={true}
                        agentColors={this.state.agentColors}
                        showPaths={this.state.showPaths}
                        onError={this.onError}
                        backgroundColor={[0, 0, 0]}
                    />
                </div>
            </div>
        );
    }
}

export default Viewer;
