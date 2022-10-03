import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import VisAgent from "./VisAgent";
import PDBModel from "./PDBModel";
import { Box3, Box3Helper, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, LineBasicMaterial, LineSegments, Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { ILogger, ILogLevel } from "js-logger/src/types";
import { TrajectoryFileInfo } from "./types";
import { AgentData } from "./VisData";
import MoleculeRenderer from "./rendering/MoleculeRenderer";
declare const NO_AGENT = -1;
export declare enum RenderStyle {
    GENERIC = 0,
    MOLECULAR = 1
}
interface AgentTypeGeometry {
    meshName: string;
    pdbName: string;
}
interface MeshLoadRequest {
    mesh: Object3D;
    cancelled: boolean;
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
    line: LineSegments<BufferGeometry>;
}
interface AgentTypeVisData {
    mesh?: string;
    scale: number;
    pdb?: string;
}
declare type AgentTypeVisDataMap = Map<string, AgentTypeVisData>;
declare type Bounds = readonly [number, number, number, number, number, number];
declare class VisGeometry {
    renderStyle: RenderStyle;
    backgroundColor: Color;
    pathEndColor: Color;
    visGeomMap: Map<number, AgentTypeGeometry>;
    meshRegistry: Map<string | number, MeshLoadRequest>;
    pdbRegistry: Map<string | number, PDBModel>;
    meshLoadAttempted: Map<string, boolean>;
    pdbLoadAttempted: Map<string, boolean>;
    scaleMapping: Map<number, number>;
    followObjectId: number;
    visAgents: VisAgent[];
    visAgentInstances: Map<number, VisAgent>;
    fixLightsToCamera: boolean;
    highlightedIds: number[];
    hiddenIds: number[];
    paths: PathData[];
    mlogger: ILogger;
    renderer: WebGLRenderer;
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
    moleculeRenderer: MoleculeRenderer;
    atomSpread: number;
    numAtomsPerAgent: number;
    currentSceneAgents: AgentData[];
    colorsData: Float32Array;
    lightsGroup: Group;
    agentMeshGroup: Group;
    agentFiberGroup: Group;
    agentPDBGroup: Group;
    agentPathGroup: Group;
    instancedMeshGroup: Group;
    idColorMapping: Map<number, number>;
    private raycaster;
    private supportsMoleculeRendering;
    private membraneAgent?;
    private resetCameraOnNewScene;
    private lodBias;
    private lodDistanceStops;
    private needToCenterCamera;
    private needToReOrientCamera;
    private rotateDistance;
    private initCameraPosition;
    private fiberEndcaps;
    constructor(loggerLevel: ILogLevel);
    setBackgroundColor(c: string | number | [number, number, number] | undefined): void;
    setupGui(): void;
    setRenderStyle(renderStyle: RenderStyle): void;
    private constructInstancedFiberEndcaps;
    get logger(): ILogger;
    get renderDom(): HTMLElement;
    handleTrajectoryData(trajectoryData: TrajectoryFileInfo): void;
    resetCamera(): void;
    centerCamera(): void;
    reOrientCamera(): void;
    zoomIn(): void;
    zoomOut(): void;
    getFollowObject(): number;
    setFollowObject(obj: number): void;
    unfollow(): void;
    setVisibleByIds(hiddenIds: number[]): void;
    setHighlightByIds(ids: number[]): void;
    dehighlight(): void;
    onNewRuntimeGeometryType(meshName: string): void;
    private resetAgentGeometry;
    onNewPdb(pdbName: string): void;
    private resetAgentPDB;
    setUpControls(element: HTMLElement): void;
    /**
     *   Setup ThreeJS Scene
     * */
    setupScene(): void;
    loadPdb(pdbName: string, assetPath: string): void;
    loadObj(meshName: string, assetPath: string): void;
    resize(width: number, height: number): void;
    reparent(parent?: HTMLElement | null): void;
    disableControls(): void;
    enableControls(): void;
    render(time: number): void;
    private transformBoundingBox;
    hitTest(offsetX: number, offsetY: number): number;
    /**
     *   Run Time Mesh functions
     */
    createMaterials(colors: (number | string)[]): void;
    clearColorMapping(): void;
    private getColorIndexForTypeId;
    private getColorForTypeId;
    setColorForIds(ids: number[], colorId: number): void;
    getColorForIndex(index: number): Color;
    /**
     *   Data Management
     */
    resetMapping(): void;
    /**
     *   Map Type ID -> Geometry
     */
    mapIdToGeom(id: number, meshName: string | undefined, pdbName: string | undefined, assetPath: string): void;
    getGeomFromId(id: number): Object3D | null;
    getPdbFromId(id: number): PDBModel | null;
    mapFromJSON(name: string, filePath: string, assetPath: string, callback?: (any: any) => void): Promise<void | Response>;
    setGeometryData(jsonData: AgentTypeVisDataMap, assetPath: string, callback?: (any: any) => void): void;
    setTickIntervalLength(axisLength: number): void;
    createTickMarks(volumeDimensions: number[], boundsAsTuple: Bounds): void;
    createBoundingBox(boundsAsTuple: Bounds): void;
    resetBounds(volumeDimensions?: number[]): void;
    setScaleForId(id: number, scale: number): void;
    getScaleForId(id: number): number;
    private createAgent;
    /**
     *   Update Scene
     **/
    updateScene(agents: AgentData[]): void;
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
    private cancelAllAsyncProcessing;
    private resetAllGeometry;
    update(agents: AgentData[]): void;
}
export { VisGeometry, NO_AGENT };
export default VisGeometry;
