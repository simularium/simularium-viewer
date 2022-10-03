import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Box3, Box3Helper, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, LineBasicMaterial, LineSegments, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { ILogger, ILogLevel } from "js-logger";
import VisAgent from "./VisAgent";
import PDBModel from "./PDBModel";
import FrontEndError from "../FrontEndError";
import { TrajectoryFileInfo, EncodedTypeMapping } from "../types";
import { AgentData } from "../VisData";
import SimulariumRenderer from "./rendering/SimulariumRenderer";
import { LegacyRenderer } from "./rendering/LegacyRenderer";
import GeometryStore from "./GeometryStore";
import { GeometryDisplayType, MeshLoadRequest } from "./types";
declare const NO_AGENT = -1;
export declare enum RenderStyle {
    WEBGL1_FALLBACK = 0,
    WEBGL2_PREFERRED = 1
}
interface PathData {
    agentId: number;
    numSegments: number;
    maxSegments: number;
    color: Color;
    points: Float32Array;
    colors: Float32Array;
    geometry: BufferGeometry;
    material: LineBasicMaterial;
    line: LineSegments;
}
declare type Bounds = readonly [number, number, number, number, number, number];
declare class VisGeometry {
    onError: (errorMessage: FrontEndError) => void;
    renderStyle: RenderStyle;
    backgroundColor: Color;
    pathEndColor: Color;
    visGeomMap: Map<number, string>;
    geometryStore: GeometryStore;
    scaleMapping: Map<number, number>;
    followObjectId: number;
    visAgents: VisAgent[];
    visAgentInstances: Map<number, VisAgent>;
    fixLightsToCamera: boolean;
    highlightedIds: number[];
    hiddenIds: number[];
    paths: PathData[];
    mlogger: ILogger;
    threejsrenderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    controls: OrbitControls;
    dl: DirectionalLight;
    boundingBox: Box3;
    boundingBoxMesh: Box3Helper;
    tickIntervalLength: number;
    tickMarksMesh: LineSegments;
    private boxNearZ;
    private boxFarZ;
    hemiLight: HemisphereLight;
    renderer: SimulariumRenderer;
    legacyRenderer: LegacyRenderer;
    atomSpread: number;
    numAtomsPerAgent: number;
    currentSceneAgents: AgentData[];
    colorsData: Float32Array;
    lightsGroup: Group;
    agentPathGroup: Group;
    instancedMeshGroup: Group;
    idColorMapping: Map<number, number>;
    private isIdColorMappingSet;
    private supportsWebGL2Rendering;
    private lodBias;
    private lodDistanceStops;
    private needToCenterCamera;
    private needToReOrientCamera;
    private rotateDistance;
    private initCameraPosition;
    private cameraDefault;
    private fibers;
    private focusMode;
    private agentsWithPdbsToDraw;
    private agentPdbsToDraw;
    constructor(loggerLevel: ILogLevel);
    setOnErrorCallBack(onError: (msg: FrontEndError) => void): void;
    setBackgroundColor(c: string | number | [number, number, number] | undefined): void;
    setupGui(): void;
    setRenderStyle(renderStyle: RenderStyle): void;
    private constructInstancedFibers;
    get logger(): ILogger;
    get renderDom(): HTMLElement;
    handleTrajectoryFileInfo(trajectoryFileInfo: TrajectoryFileInfo): void;
    private handleBoundingBoxData;
    private handleCameraData;
    resetCamera(): void;
    resetCameraPosition(): void;
    centerCamera(): void;
    reOrientCamera(): void;
    private dolly;
    zoomIn(): void;
    zoomOut(): void;
    setPanningMode(pan: boolean): void;
    setFocusMode(focus: boolean): void;
    getFollowObject(): number;
    setFollowObject(obj: number): void;
    unfollow(): void;
    setVisibleByIds(hiddenIds: number[]): void;
    setHighlightByIds(ids: number[]): void;
    dehighlight(): void;
    private getAllTypeIdsForGeometryName;
    onNewRuntimeGeometryType(geoName: string, displayType: GeometryDisplayType, data: PDBModel | MeshLoadRequest): void;
    setUpControls(element: HTMLElement): void;
    /**
     *   Setup ThreeJS Scene
     * */
    setupScene(): void;
    resize(width: number, height: number): void;
    reparent(parent?: HTMLElement | null): void;
    disableControls(): void;
    enableControls(): void;
    private setPdbLods;
    render(_time: number): void;
    private transformBoundingBox;
    hitTest(offsetX: number, offsetY: number): number;
    private setAgentColors;
    private setColorArray;
    addNewColor(color: number | string): void;
    createMaterials(colors: (number | string)[]): void;
    clearColorMapping(): void;
    private getColorIndexForTypeId;
    private getColorForTypeId;
    private setColorForId;
    setColorForIds(ids: number[], colorId: number): void;
    getColorForIndex(index: number): Color;
    finalizeIdColorMapping(): void;
    /**
     *   Data Management
     */
    resetMapping(): void;
    private getGeoForAgentType;
    handleAgentGeometry(typeMapping: EncodedTypeMapping): void;
    private setGeometryData;
    setTickIntervalLength(axisLength: number): void;
    createTickMarks(volumeDimensions: number[], boundsAsTuple: Bounds): void;
    createBoundingBox(boundsAsTuple: Bounds): void;
    resetBounds(volumeDimensions?: number[]): void;
    setScaleForId(id: number, scale: number): void;
    getScaleForId(id: number): number;
    private createAgent;
    private addPdbToDrawList;
    private addMeshToDrawList;
    private addFiberToDrawList;
    /**
     *   Update Scene
     **/
    private updateScene;
    animateCamera(): void;
    findPathForAgent(id: number): PathData | null;
    addPathForAgent(id: number, maxSegments?: number, color?: Color): PathData;
    removePathForAgent(id: number): void;
    private removeOnePath;
    private removeAllPaths;
    addPointToPath(path: PathData, x: number, y: number, z: number, dx: number, dy: number, dz: number): void;
    setShowPaths(showPaths: boolean): void;
    toggleAllAgentsHidden(hideAllAgents: boolean): void;
    setShowBounds(showBounds: boolean): void;
    showPathForAgent(id: number, visible: boolean): void;
    clearForNewTrajectory(): void;
    private resetAllGeometry;
    update(agents: AgentData[]): void;
}
export { VisGeometry, NO_AGENT };
export default VisGeometry;
