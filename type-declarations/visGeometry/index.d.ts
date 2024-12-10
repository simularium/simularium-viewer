import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box3, Box3Helper, Color, DirectionalLight, Group, HemisphereLight, LineSegments, OrthographicCamera, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { Pane } from "tweakpane";
import { ILogger, ILogLevel } from "js-logger";
import VisAgent from "./VisAgent.js";
import PDBModel from "./PDBModel.js";
import AgentPath from "./agentPath.js";
import { FrontEndError } from "../simularium/FrontEndError.js";
import { AgentData, CachedFrame, EncodedTypeMapping, PerspectiveCameraSpec } from "../simularium/types.js";
import SimulariumRenderer from "./rendering/SimulariumRenderer.js";
import { LegacyRenderer } from "./rendering/LegacyRenderer.js";
import GeometryStore from "./GeometryStore.js";
import { ColorAssignment, GeometryDisplayType, MeshLoadRequest } from "./types.js";
import ColorHandler from "./ColorHandler.js";
declare const NO_AGENT = -1;
export declare enum RenderStyle {
    WEBGL1_FALLBACK = 0,
    WEBGL2_PREFERRED = 1
}
type Bounds = readonly [number, number, number, number, number, number];
declare class VisGeometry {
    onError: (error: FrontEndError) => void;
    renderStyle: RenderStyle;
    backgroundColor: Color;
    pathEndColor: Color;
    visGeomMap: Map<number, string>;
    geometryStore: GeometryStore;
    scaleMapping: Map<number, number>;
    followObjectId: number;
    visAgents: VisAgent[];
    visAgentInstances: Map<number, VisAgent>;
    private availableAgentPool;
    fixLightsToCamera: boolean;
    highlightedIds: number[];
    hiddenIds: number[];
    agentPaths: Map<number, AgentPath>;
    mlogger: ILogger;
    threejsrenderer: WebGLRenderer;
    scene: Scene;
    perspectiveCamera: PerspectiveCamera;
    orthographicCamera: OrthographicCamera;
    camera: PerspectiveCamera | OrthographicCamera;
    controls: OrbitControls;
    dl: DirectionalLight;
    hemiLight: HemisphereLight;
    boundingBox: Box3;
    boundingBoxMesh: Box3Helper;
    showBounds: boolean;
    tickMarksMesh: LineSegments;
    tickIntervalLength: number;
    private boxNearZ;
    private boxFarZ;
    colorHandler: ColorHandler;
    renderer: SimulariumRenderer;
    legacyRenderer: LegacyRenderer;
    currentSceneData: CachedFrame;
    colorsData: Float32Array;
    lightsGroup: Group;
    agentPathGroup: Group;
    instancedMeshGroup: Group;
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
    gui?: Pane;
    private cam1;
    private cam2;
    private cam3;
    private agentsWithPdbsToDraw;
    private agentPdbsToDraw;
    constructor(loggerLevel: ILogLevel);
    setOnErrorCallBack(onError: (error: FrontEndError) => void): void;
    setBackgroundColor(c: string | number | [number, number, number] | undefined): void;
    /**
     * Derive the default distance from camera to target from `cameraDefault`.
     * Unless `cameraDefault` has been meaningfully changed by a call to
     * `handleCameraData`, this will be equal to `DEFAULT_CAMERA_Z_POSITION`.
     */
    private getDefaultOrbitRadius;
    /** Set frustum of `orthographicCamera` from fov/aspect of `perspectiveCamera */
    private updateOrthographicFrustum;
    private loadCamera;
    private storeCamera;
    setupGui(container?: HTMLElement): void;
    destroyGui(): void;
    setRenderStyle(renderStyle: RenderStyle): void;
    private constructInstancedFibers;
    get logger(): ILogger;
    get renderDom(): HTMLElement;
    handleCameraData(cameraDefault?: PerspectiveCameraSpec): void;
    resetCamera(): void;
    resetCameraPosition(): void;
    centerCamera(): void;
    reOrientCamera(): void;
    private dolly;
    zoomIn(): void;
    zoomOut(): void;
    setPanningMode(pan: boolean): void;
    setAllowViewPanning(allow: boolean): void;
    setFocusMode(focus: boolean): void;
    getObjectData(id: number): AgentData;
    getFollowObject(): number;
    setFollowObject(obj: number): void;
    unfollow(): void;
    setVisibleByIds(hiddenIds: number[]): void;
    setHighlightByIds(ids: number[]): void;
    dehighlight(): void;
    private getAllTypeIdsForGeometryName;
    onNewRuntimeGeometryType(geoName: string, displayType: GeometryDisplayType, data: PDBModel | MeshLoadRequest): void;
    private setupControls;
    private updateControlsZoomBounds;
    resize(width: number, height: number): void;
    setCameraType(ortho: boolean): void;
    private createWebGL;
    setCanvasOnTheDom(parent: HTMLElement | null, disableControls: boolean): void;
    toggleControls(lockedCamera: boolean): void;
    disableControls(): void;
    enableControls(): void;
    private setPdbLods;
    render(_time: number): void;
    private transformBoundingBox;
    hitTest(offsetX: number, offsetY: number): number;
    private setAgentColors;
    createMaterials(colors: (number | string)[]): void;
    applyColorToAgents(colorAssignments: ColorAssignment[]): void;
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
    findPathForAgent(id: number): AgentPath | null;
    addPathForAgent(id: number, maxSegments?: number, color?: Color): AgentPath;
    removePathForAgent(id: number): void;
    private removeAllPaths;
    addPointToPath(path: AgentPath, x: number, y: number, z: number, dx: number, dy: number, dz: number): void;
    setShowPaths(showPaths: boolean): void;
    toggleAllAgentsHidden(hideAllAgents: boolean): void;
    setShowBounds(showBounds: boolean): void;
    showPathForAgent(id: number, visible: boolean): void;
    clearForNewTrajectory(): void;
    private resetAllGeometry;
    update(agents: CachedFrame): void;
}
export { VisGeometry, NO_AGENT };
export default VisGeometry;
