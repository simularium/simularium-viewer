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
    CacheLog,
    TrajectoryType,
} from "@aics/simularium-viewer";
import type {
    ISimulariumFile,
    UIDisplayData,
    SelectionStateInfo,
    SelectionEntry,
    AgentData,
} from "@aics/simularium-viewer";
import "../../style/style.css";

// local test bed imports
import PointSimulator from "./simulators/PointSimulator";
import BindingSimulator from "./simulators/BindingSimulator2D";
import PointSimulatorLive from "./simulators/PointSimulatorLive";
import PdbSimulator from "./simulators/PdbSimulator";
import SinglePdbSimulator from "./simulators/SinglePdbSimulator";
import CurveSimulator from "./simulators/CurveSimulator";
import SingleCurveSimulator from "./simulators/SingleCurveSimulator";
import MetaballSimulator from "./simulators/MetaballSimulator";

import ColorPicker from "./Components/ColorPicker";
import RecordMovieComponent from "./Components/RecordMovieComponent";
import ConversionForm from "./Components/ConversionForm";
import AgentMetadata from "./Components/AgentMetadata";
import { agentColors } from "./constants";
import { BaseType, CustomType } from "./types";
import {
    SMOLDYN_TEMPLATE,
    UI_BASE_TYPES,
    UI_CUSTOM_TYPES,
    UI_TEMPLATE_DOWNLOAD_URL_ROOT,
    UI_TEMPLATE_URL_ROOT,
} from "./api-settings";
import CacheAndStreamingLogs from "./Components/CacheAndStreamingLogs";

import "./style.css";

let playbackFile = "TEST_LIVEMODE_API";
let queryStringFile = "";
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("file")) {
    queryStringFile = urlParams.get("file") || "";
    playbackFile = queryStringFile;
}

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
    simulariumFile: {
        name: string;
        data: ISimulariumFile | null;
    } | null;
    serverHealthy: boolean;
    isRecordingEnabled: boolean;
    trajectoryTitle: string;
    initialPlay: boolean;
    firstFrameTime: number;
    followObjectData: AgentData;
    cacheLog: CacheLog;
    playbackPlaying: boolean;
    streaming: boolean;
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
    simulariumFile: null,
    serverHealthy: false,
    isRecordingEnabled: true,
    trajectoryTitle: "",
    initialPlay: true,
    firstFrameTime: 0,
    followObjectData: null,
    cacheLog: {
        size: 0,
        numFrames: 0,
        maxSize: 0,
        enabled: false,
        firstFrameNumber: 0,
        firstFrameTime: 0,
        lastFrameNumber: 0,
        lastFrameTime: 0,
    },
    playbackPlaying: false,
    streaming: false,
    conversionFileName: "",
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
            this.handlePauseStreaming();
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
            .changeFile(
                {
                    netConnectionSettings: this.netConnectionSettings,
                },
                this.state.conversionFileName
            )
            .then(() => {
                simulariumController.gotoTime(0);
            })
            .then(() =>
                this.setState({
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
        // const totalDuration = (data.totalSteps - 1) * data.timeStepSize;
        const totalDuration = data.totalSteps;
        this.setState({
            totalDuration,
            timeStep: data.timeStepSize,
            currentFrame: 0,
            currentTime: 0,
            trajectoryTitle: data.trajectoryTitle,
        });
    }

    public handlePlay(): void {
        simulariumController.resumePlayback();
        if (!simulariumController.isStreaming()) {
            simulariumController.resumeStreaming();
        }
    }

    public handlePause(): void {
        simulariumController.pausePlayback();
        if (
            simulariumController.visData.currentFrameNumber >
            simulariumController.visData.frameCache.getFirstFrameNumber()
        ) {
            simulariumController.resumeStreaming();
        }
    }

    public handleScrubTime(event): void {
        simulariumController.movePlaybackTime(parseFloat(event.target.value));
    }

    public handleScrubFrame(event): void {
        simulariumController.movePlaybackFrame(parseInt(event.target.value));
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
        simulariumController.movePlaybackFrame(this.state.currentFrame + 1);
    }

    public gotoPreviousFrame(): void {
        simulariumController.movePlaybackFrame(this.state.currentFrame - 1);
    }

    public handlePauseStreaming(): void {
        simulariumController.pauseStreaming();
        this.setState({ streaming: simulariumController.isStreaming() });
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

    private configureAndLoad() {
        if (playbackFile.startsWith("http")) {
            simulariumController.configureNetwork(this.netConnectionSettings);
            return this.loadFromUrl(playbackFile);
        }
        if (playbackFile === "TEST_LIVEMODE_API") {
            simulariumController.changeFile(
                {
                    clientSimulator: new PointSimulatorLive(4, 4),
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_POINTS") {
            simulariumController.changeFile(
                {
                    clientSimulator: new PointSimulator(8000, 4),
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_BINDING") {
            simulariumController.setCameraType(true);
            simulariumController.changeFile(
                {
                    clientSimulator: new BindingSimulator([
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
                    ]),
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_FIBERS") {
            simulariumController.changeFile(
                {
                    clientSimulator: new CurveSimulator(1000, 4),
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_SINGLE_FIBER") {
            simulariumController.changeFile(
                {
                    clientSimulator: new SingleCurveSimulator(),
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_PDB") {
            simulariumController.changeFile(
                {
                    clientSimulator: new PdbSimulator(),
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_SINGLE_PDB") {
            simulariumController.changeFile(
                {
                    clientSimulator: new SinglePdbSimulator("3IRL"),
                },
                playbackFile
            );
        } else if (playbackFile === "TEST_METABALLS") {
            simulariumController.changeFile(
                {
                    clientSimulator: new MetaballSimulator(),
                },
                playbackFile
            );
        } else {
            this.setState({
                simulariumFile: { name: playbackFile, data: null },
            });
            simulariumController.changeFile(
                {
                    netConnectionSettings: this.netConnectionSettings,
                },
                playbackFile
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

    public handleCacheUpdate = (log: CacheLog) => {
        this.setState({
            cacheLog: log,
            playbackPlaying: simulariumController.isPlaying(),
            streaming: simulariumController.isStreaming(),
        });
    };

    public handleStreamingChange = (streaming: boolean) => {
        this.setState({ streaming });
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
                        this.handlePauseStreaming();
                        playbackFile = event.target.value;
                        this.configureAndLoad();
                    }}
                    defaultValue={playbackFile}
                >
                    <option value={queryStringFile}>{queryStringFile}</option>
                    <option value="TEST_LIVEMODE_API">
                        TEST LIVE MODE API
                    </option>
                    <option value="actin012_3.h5">Actin 12_3</option>
                    <option value="listeria_rocketbugs_normal_fine_2_filtered.simularium">
                        listeria 01
                    </option>
                    <option value="kinesin002_01.h5">kinesin 002</option>
                    <option value="microtubules038_10.h5">MT 38</option>
                    <option value="microtubules_v2_shrinking.h5">M Tub</option>
                    <option value="aster.cmo">Aster</option>
                    <option value="microtubules30_1.h5">MT 30</option>
                    <option value="endocytosis.simularium">Endocytosis</option>
                    <option value="pc4covid19.simularium">COVIDLUNG</option>
                    <option value="nanoparticle_wrapping.simularium">
                        Nanoparticle wrapping
                    </option>
                    <option value="smoldyn_min1.simularium">
                        Smoldyn min1
                    </option>
                    <option value="smoldyn_spine.simularium">
                        Smoldyn spine
                    </option>
                    <option value="medyan_Chandrasekaran_2019_UNI_alphaA_0.1_MA_0.675.simularium">
                        medyan 625
                    </option>
                    <option value="medyan_Chandrasekaran_2019_UNI_alphaA_0.1_MA_0.0225.simularium">
                        medyan 0225
                    </option>
                    <option value="springsalad_condensate_formation_Below_Ksp.simularium">
                        springsalad below ksp
                    </option>
                    <option value="springsalad_condensate_formation_At_Ksp.simularium">
                        springsalad at ksp
                    </option>
                    <option value="springsalad_condensate_formation_Above_Ksp.simularium">
                        springsalad above ksp
                    </option>
                    <option value="blood-plasma-1.0.simularium">
                        blood plasma
                    </option>
                    <option value="TEST_SINGLE_PDB">TEST SINGLE PDB</option>
                    <option value="TEST_PDB">TEST PDB</option>
                    <option value="TEST_SINGLE_FIBER">TEST SINGLE FIBER</option>
                    <option value="TEST_FIBERS">TEST FIBERS</option>
                    <option value="TEST_POINTS">TEST POINTS</option>
                    <option value="TEST_METABALLS">TEST METABALLS</option>
                    <option value="TEST_BINDING">TEST BINDING</option>
                </select>

                <button onClick={() => this.translateAgent()}>
                    TranslateAgent
                </button>
                <button onClick={() => simulariumController.clearFile()}>
                    Clear
                </button>
                <button onClick={() => this.loadSmoldynFile()}>
                    Load a smoldyn trajectory
                </button>
                <br />
                <button onClick={this.handlePlay.bind(this)}>
                    Play / resume streaming
                </button>
                <button onClick={this.handlePause.bind(this)}>
                    Pause playback
                </button>
                <button
                    onClick={() => simulariumController.stop()}
                >
                    stop / abort sim
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
                    min={0}
                    step={1}
                    value={this.state.currentFrame}
                    max={this.state.totalDuration}
                    onChange={this.handleScrubFrame}
                />
                <label htmlFor="slider">
                    {this.state.currentFrame * this.state.timeStep +
                        this.state.firstFrameTime}
                    / {this.state.totalDuration * this.state.timeStep}
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
                <button
                    onClick={() =>
                        this.setRecordingEnabled(!this.state.isRecordingEnabled)
                    }
                >
                    {this.state.isRecordingEnabled ? "Disable" : "Enable"}{" "}
                    Recording
                </button>
                {this.state.isRecordingEnabled && (
                    <RecordMovieComponent
                        startRecordingHandler={
                            simulariumController.startRecording
                        }
                        stopRecordingHandler={
                            simulariumController.stopRecording
                        }
                    />
                )}
                <AgentMetadata agentData={this.state.followObjectData} />
                <CacheAndStreamingLogs
                    playbackPlayingState={this.state.playbackPlaying}
                    isStreamingState={
                        this.state.streaming
                    }
                    cacheLog={this.state.cacheLog}
                    playbackFrame={
                        simulariumController.visData.currentFrameNumber
                    }
                    totalDuration={Math.ceil(
                        this.state.totalDuration / this.state.timeStep
                    )}
                />
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
                        maxCacheSize={2e6} //  means no limit, provide limits in bytes, 1MB = 1000000, 1GB = 1000000000
                        onCacheUpdate={this.handleCacheUpdate.bind(this)}
                        onStreamingChange={(streaming) => {
                            this.handleStreamingChange(streaming);
                        }}
                    />
                </div>
            </div>
        );
    }
}

export default Viewer;
