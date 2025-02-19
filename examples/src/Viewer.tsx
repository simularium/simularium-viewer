import React from "react";
import { isEqual, findIndex, reduce, map as lodashMap } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { InputParams } from "tweakpane";

// viewer package imports
import SimulariumViewer, {
    SimulariumController,
    RenderStyle,
    loadSimulariumFile,
    FrontEndError,
    ErrorLevel,
    NetConnectionParams,
    TrajectoryFileInfo,
    TrajectoryType,
} from "@aics/simularium-viewer";
import type {
    ISimulariumFile,
    UIDisplayData,
    SelectionStateInfo,
    SelectionEntry,
    AgentData,
    IClientSimulatorImpl,
} from "@aics/simularium-viewer";

import PointSimulator from "./simulators/PointSimulator.ts";
import BindingSimulator from "./simulators/BindingSimulator2D.ts";
import PointSimulatorLive from "./simulators/PointSimulatorLive.ts";
import PdbSimulator from "./simulators/PdbSimulator.ts";
import SinglePdbSimulator from "./simulators/SinglePdbSimulator.ts";
import CurveSimulator from "./simulators/CurveSimulator.ts";
import SingleCurveSimulator from "./simulators/SingleCurveSimulator.ts";
import MetaballSimulator from "./simulators/MetaballSimulator.ts";

import ColorPicker from "./Components/ColorPicker.tsx";
import RecordMovieComponent from "./Components/RecordMovieComponent.tsx";
import ConversionForm from "./Components/ConversionForm/index.tsx";
import AgentMetadata from "./Components/AgentMetadata.tsx";
import FileSelection from "./Components/FileSelect.tsx";

import { agentColors, AWAITING_CONVERSION, AWAITING_SMOLDYN_SIM_RUN, TRAJECTORY_OPTIONS } from "./constants.ts";
import { BaseType, CustomType } from "./types.ts";
import {
    SMOLDYN_TEMPLATE,
    UI_BASE_TYPES,
    UI_CUSTOM_TYPES,
    UI_TEMPLATE_DOWNLOAD_URL_ROOT,
    UI_TEMPLATE_URL_ROOT,
} from "./api-settings.ts";

import "@aics/simularium-viewer/style/style.css";
import "./style.css";

interface ViewerState {
    renderStyle: RenderStyle;
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
    filePending: {
        type: TrajectoryType;
        template: { [key: string]: any };
        templateData: { [key: string]: any };
    } | null;
    selectedFile: string;
    simulariumFile: {
        name: string;
        data: ISimulariumFile | null;
    } | null;
    clientSimulator: boolean;
    serverHealthy: boolean;
    isRecordingEnabled: boolean;
    trajectoryTitle: string;
    initialPlay: boolean;
    firstFrameTime: number;
    followObjectData: AgentData | null;
    conversionFileName: string;
}

const simulariumController = new SimulariumController({});

let currentFrame = 0;
let currentTime = 0;

const initialState: ViewerState = {
    renderStyle: RenderStyle.WEBGL2_PREFERRED,
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
    selectionStateInfo: {
        highlightedAgents: [],
        hiddenAgents: [],
        appliedColors: [],
    },
    filePending: null,
    selectedFile: "TEST_LIVEMODE_API",
    simulariumFile: null,
    clientSimulator: false,
    serverHealthy: false,
    isRecordingEnabled: true,
    trajectoryTitle: "",
    initialPlay: true,
    firstFrameTime: 0,
    followObjectData: null,
    conversionFileName: "",
};

class Viewer extends React.Component<InputParams, ViewerState> {
    private viewerRef: React.RefObject<SimulariumViewer>;
    private panMode = false;
    private focusMode = true;
    private orthoMode = false;
    private smoldynInput = "100";
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
            };
        } else {
            this.netConnectionSettings = {
                serverIp: "staging-simularium-ecs.allencell.org",
                serverPort: 443,
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
            console.warn(
                `ERROR, something is broken: ${error.message} ${error.htmlData}`
            );
        } else if (error.level === ErrorLevel.WARNING) {
            console.warn(
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
                    lodashMap(fileRefs, (ref) =>
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
        simulariumController.checkServerHealth(
            this.onHealthCheckResponse,
            this.netConnectionSettings
        );
    }

    public convertFile(obj: Record<string, any>, fileType: TrajectoryType) {
        const fileName = uuidv4() + ".simularium";
        this.setState({
            conversionFileName: fileName,
            selectedFile: AWAITING_CONVERSION,
        });

        simulariumController
            .convertTrajectory(
                this.netConnectionSettings,
                obj,
                fileType,
                fileName
            )
            .then(() => {
                this.clearPendingFile();
            })
            .catch((err) => {
                console.error(err);
            });
    }

    public loadSmoldynSim() {
        this.clearFile();
        this.setState({ selectedFile: AWAITING_SMOLDYN_SIM_RUN });
        simulariumController.checkServerHealth(
            this.onHealthCheckResponse,
            this.netConnectionSettings
        );
        const fileName = "smoldyn_sim" + uuidv4() + ".simularium";
        simulariumController
            .startSmoldynSim(
                this.netConnectionSettings,
                fileName,
                this.smoldynInput
            )
            .then(() => {
                this.clearPendingFile();
            })
            .then(() => {
                simulariumController.initNewFile(
                    { netConnectionSettings: this.netConnectionSettings },
                    true
                );
            })
            .then(() => {
                this.setState({ selectedFile: fileName });
            })
            .catch((err) => {
                console.error("Error starting Smoldyn sim: ", err);
                this.setState({ selectedFile: "" });
            });
    }

    public clearPendingFile() {
        this.setState({ filePending: null });
    }

    public loadFile(trajectoryFile, fileName, geoAssets?) {
        const simulariumFile = fileName.includes(".simularium")
            ? trajectoryFile
            : null;
        this.setState({ initialPlay: true });
        return simulariumController
            .handleFileChange(simulariumFile, fileName, geoAssets)
            .catch(console.log);
    }

    public handleJsonMeshData(jsonData): void {
        console.log("Mesh JSON Data: ", jsonData);
    }

    public handleTimeChange(timeData): void {
        currentFrame = timeData.frameNumber;
        currentTime = timeData.time;
        if (this.state.initialPlay) {
            this.setState({ initialPlay: false, firstFrameTime: currentTime });
        }
        this.setState({ currentFrame, currentTime });
        if (currentFrame < 0) {
            simulariumController.pause();
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

    public receiveConvertedFile(): void {
        simulariumController
            .initNewFile({
                netConnectionSettings: this.netConnectionSettings,
            })
            .then(() => {
                simulariumController.gotoTime(0);
            })
            .then(() =>
                this.setState({
                    selectedFile: this.state.conversionFileName,
                    conversionFileName: "",
                })
            )
            .catch((e) => {
                console.warn(e);
            });
    }

    public handleTrajectoryInfo(data: TrajectoryFileInfo): void {
        console.log("Trajectory info arrived", data);
        const conversionActive = !!this.state.conversionFileName;
        if (conversionActive) {
            this.receiveConvertedFile();
        }
        // NOTE: Currently incorrectly assumes initial time of 0
        const totalDuration = (data.totalSteps - 1) * data.timeStepSize;
        this.setState({
            totalDuration,
            timeStep: data.timeStepSize,
            currentFrame: 0,
            currentTime: 0,
            trajectoryTitle: data.trajectoryTitle,
        });
    }

    public handleScrubTime(event): void {
        simulariumController.gotoTime(parseFloat(event.target.value));
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
        const uniqueTags: string[] = [...new Set(allTags)] as string[];
        if (
            isEqual(uiDisplayData, this.state.selectionStateInfo.appliedColors)
        ) {
            return;
        }
        this.setState({
            particleTypeNames: uiDisplayData.map((a) => a.name),
            particleTypeTags: uniqueTags,
            selectionStateInfo: {
                ...initialState.selectionStateInfo,
                appliedColors: uiDisplayData,
            },
        });
    }

    public gotoNextFrame(): void {
        simulariumController.gotoTime(
            this.state.currentTime + this.state.timeStep
        );
    }

    public gotoPreviousFrame(): void {
        simulariumController.gotoTime(
            this.state.currentTime - this.state.timeStep
        );
    }

    private translateAgent() {
        simulariumController.sendUpdate({
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

    public clearFile() {
        simulariumController.clearFile();
        this.setState({
            selectedFile: "",
            simulariumFile: null,
            clientSimulator: false,
        });
    }

    private configureLocalClientSimulator(selectedFile: string) {
        const config: { clientSimulator?: IClientSimulatorImpl } = {};

        switch (selectedFile) {
            case "TEST_LIVEMODE_API":
                console.log("Using Live Mode API: PointSimulatorLive");
                config.clientSimulator = new PointSimulatorLive(4, 4);
                break;

            case "TEST_POINTS":
                config.clientSimulator = new PointSimulator(8000, 4);
                break;

            case "TEST_BINDING":
                simulariumController.setCameraType(true);
                config.clientSimulator = new BindingSimulator([
                    { id: 0, count: 30, radius: 3, partners: [1, 2] },
                    {
                        id: 1,
                        count: 300,
                        radius: 1,
                        partners: [0],
                        kOn: 0.1,
                        kOff: 0.5,
                    },
                    {
                        id: 2,
                        count: 300,
                        radius: 1,
                        partners: [0],
                        kOn: 0.1,
                        kOff: 0.5,
                    },
                ]);
                break;

            case "TEST_FIBERS":
                config.clientSimulator = new CurveSimulator(1000, 4);
                break;

            case "TEST_SINGLE_FIBER":
                config.clientSimulator = new SingleCurveSimulator();
                break;

            case "TEST_PDB":
                config.clientSimulator = new PdbSimulator();
                break;

            case "TEST_SINGLE_PDB":
                config.clientSimulator = new SinglePdbSimulator("3IRL");
                break;

            case "TEST_METABALLS":
                config.clientSimulator = new MetaballSimulator();
                break;
            default:
                break;
        }
        return config;
    }

    // in development, requires appropriate local branch of octopus
    // to run Brownian Motion simulator
    private configureRemoteClientSimulator(fileId: string) {
        this.setState({
            clientSimulator: true,
            simulariumFile: { name: fileId, data: null },
        });
        simulariumController.changeFile(
            {
                netConnectionSettings: this.netConnectionSettings,
                requestJson: true,
            },
            fileId
        );
    }

    private handleFileSelect(file: string) {
        simulariumController.stop();
        this.clearFile();
        this.setState({ selectedFile: file }, () => {
            this.configureAndLoad();
        });
    }

    private configureAndLoad() {
        simulariumController.configureNetwork(this.netConnectionSettings);
        if (
            this.state.selectedFile === AWAITING_SMOLDYN_SIM_RUN ||
            this.state.selectedFile === AWAITING_CONVERSION
        ) {
            return;
        }
        if (this.state.selectedFile.startsWith("http")) {
            return this.loadFromUrl(this.state.selectedFile);
        }
        const fileId = TRAJECTORY_OPTIONS.find(
            (option) => option.id === this.state.selectedFile
        );
        if (!fileId) {
            console.error("Invalid file id");
            return;
        }
        if (fileId.clientSimulator) {
            const clientSim = this.configureLocalClientSimulator(fileId.id);
            simulariumController.changeFile(clientSim, fileId.id);
            this.setState({
                clientSimulator: true,
            });
            return;
        } else if (fileId.remoteClientSimulator) {
            this.configureRemoteClientSimulator(fileId.id);
        } else if (fileId.networkedTrajectory) {
            this.setState({
                simulariumFile: { name: fileId.id, data: null },
            });
            simulariumController.changeFile(
                {
                    netConnectionSettings: this.netConnectionSettings,
                },
                fileId.id
            );
        }
    }

    private downloadFile() {
        const { simulariumFile } = this.state;
        if (!simulariumFile) {
            return;
        }
        let href = "";
        if (!simulariumFile.data) {
            href = `https://aics-simularium-data.s3.us-east-2.amazonaws.com/trajectory/${simulariumFile.name}`;
        } else {
            href = URL.createObjectURL(simulariumFile.data.getAsBlob());
        }
        const downloadLink = document.createElement("a");
        downloadLink.download = simulariumFile.name;
        downloadLink.style.display = "none";
        downloadLink.href = href;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
    }

    public updateAgentColorArray = (color) => {
        const agentColors = [...this.state.agentColors, color] as string[];
        this.setState({ agentColors });
    };

    public setColorSelectionInfo = (appliedColors) => {
        this.setState({
            ...this.state,
            selectionStateInfo: {
                hiddenAgents: this.state.selectionStateInfo.hiddenAgents,
                highlightedAgents:
                    this.state.selectionStateInfo.highlightedAgents,
                appliedColors: appliedColors,
            },
        });
    };

    ////// DOWNLOAD MOVIES PROPS AND FUNCTIONS //////
    public getRecordedMovieTitle = (): string => {
        return this.state.trajectoryTitle
            ? this.state.trajectoryTitle
            : "simularium";
    };

    public downloadMovie = (videoBlob: Blob, title?: string) => {
        const url = URL.createObjectURL(videoBlob);
        const filename = title ? title + ".mp4" : "simularium.mp4";
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    public onRecordedMovie = (videoBlob: Blob) => {
        const title = this.getRecordedMovieTitle();
        this.downloadMovie(videoBlob, title);
    };

    public setRecordingEnabled = (value: boolean): void => {
        this.setState({ isRecordingEnabled: value });
    };

    public handleFollowObjectData = (agentData: AgentData) => {
        this.setState({ followObjectData: agentData });
    };

    public updateBrownianSimulator = () => {
        const updateData = {
            data: {
                agents: {
                    "1": {
                        _updater: "accumulate",
                        position: [0.1, 0, 0],
                    },
                },
            },
        };
        simulariumController.sendUpdate(updateData);
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
                <FileSelection
                    selectedFile={this.state.selectedFile}
                    onFileSelect={(file: string) => {
                        this.handleFileSelect(file);
                    }}
                    loadSmoldynFile={() => this.loadSmoldynFile()}
                    clearFile={this.clearFile.bind(this)}
                    loadSmoldynPreConfiguredSim={() => this.loadSmoldynSim()}
                    setRabbitCount={(count) => {
                        this.smoldynInput = count;
                    }}
                />
                <button onClick={() => this.translateAgent()}>
                    TranslateAgent
                </button>
                <button onClick={() => simulariumController.clearFile()}>
                    Clear
                </button>
                <button onClick={() => this.loadSmoldynFile()}>
                    Convert a smoldyn trajectory
                </button>
                <br />
                <label>
                    Initial Rabbit Count:
                    <input
                        defaultValue="100"
                        onChange={(event) => {
                            this.smoldynInput = event.target.value;
                        }}
                    />
                </label>
                <button onClick={() => simulariumController.resume()}>
                    Play
                </button>
                <button onClick={() => simulariumController.pause()}>
                    Pause
                </button>
                <button onClick={() => simulariumController.stop()}>
                    stop
                </button>
                <button onClick={this.gotoPreviousFrame.bind(this)}>
                    Previous Frame
                </button>
                <button onClick={this.gotoNextFrame.bind(this)}>
                    Next Frame
                </button>
                <input
                    name="slider"
                    type="range"
                    min={this.state.firstFrameTime}
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
                                this.state.renderStyle ===
                                RenderStyle.WEBGL1_FALLBACK
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
                <button
                    onClick={() => {
                        this.panMode = !this.panMode;
                        simulariumController.setPanningMode(this.panMode);
                    }}
                >
                    Pan/Rotate Mode
                </button>
                <button
                    onClick={() => {
                        this.focusMode = !this.focusMode;
                        simulariumController.setFocusMode(this.focusMode);
                    }}
                >
                    Focus Mode
                </button>
                <button
                    onClick={() => {
                        this.orthoMode = !this.orthoMode;
                        simulariumController.setCameraType(this.orthoMode);
                    }}
                >
                    Camera mode
                </button>
                <br />
                <button
                    onClick={() =>
                        simulariumController.getMetrics(
                            this.netConnectionSettings
                        )
                    }
                >
                    Get available metrics
                </button>
                <button onClick={this.downloadFile.bind(this)}>download</button>
                <button
                    onClick={() =>
                        simulariumController.getPlotData(
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
                    Tick interval length:{" "}
                    {simulariumController.tickIntervalLength}
                </span>
                <br></br>
                <ColorPicker
                    uiDisplayData={this.state.selectionStateInfo.appliedColors}
                    particleTypeNames={this.state.particleTypeNames}
                    agentColors={this.state.agentColors}
                    updateAgentColorArray={this.updateAgentColorArray}
                    setColorSelectionInfo={this.setColorSelectionInfo}
                />
                <RecordMovieComponent
                    startRecordingHandler={simulariumController.startRecording}
                    stopRecordingHandler={simulariumController.stopRecording}
                    setRecordingEnabled={() => {
                        this.setRecordingEnabled(
                            !this.state.isRecordingEnabled
                        );
                    }}
                    isRecordingEnabled={this.state.isRecordingEnabled}
                />
                <AgentMetadata agentData={this.state.followObjectData} />
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
                        showCameraControls={false}
                        onTrajectoryFileInfoChanged={this.handleTrajectoryInfo.bind(
                            this
                        )}
                        selectionStateInfo={this.state.selectionStateInfo}
                        onUIDisplayDataChanged={this.handleUIDisplayData.bind(
                            this
                        )}
                        onRecordedMovie={
                            this.state.isRecordingEnabled
                                ? this.onRecordedMovie
                                : undefined
                        }
                        onFollowObjectChanged={this.handleFollowObjectData.bind(
                            this
                        )}
                        loadInitialData={true}
                        agentColors={this.state.agentColors}
                        showPaths={this.state.showPaths}
                        onError={this.onError}
                        backgroundColor={[0, 0, 0]}
                        lockedCamera={false}
                        disableCache={false}
                        maxCacheSize={Infinity} //  means no limit, provide limits in bytes, 1MB = 1000000, 1GB = 1000000000
                    />
                </div>
            </div>
        );
    }
}

export default Viewer;
