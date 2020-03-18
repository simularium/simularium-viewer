import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Material, LineBasicMaterial, Geometry, BufferGeometry, Box3, Box3Helper, Color, MeshBasicMaterial, SphereBufferGeometry, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, WebGLRenderer, Mesh, Object3D } from "three";
interface PathData {
    agent: number;
    numSegments: number;
    maxSegments: number;
    color: Color;
    points: Float32Array;
    colors: Float32Array;
    geometry: BufferGeometry;
    material: LineBasicMaterial;
    line: any;
}
declare class VisGeometry {
    handleTrajectoryData: any;
    visGeomMap: Map<number, string>;
    meshRegistry: Map<string | number, Mesh>;
    meshLoadAttempted: Map<string, boolean>;
    scaleMapping: Map<number, number>;
    geomCount: number;
    materials: Material[];
    desatMaterials: Material[];
    highlightMaterial: MeshBasicMaterial;
    followObject: Object3D | null;
    runTimeMeshes: Mesh[];
    runTimeFiberMeshes: Map<string, Mesh>;
    mlastNumberOfAgents: number;
    colorVariant: number;
    fixLightsToCamera: boolean;
    highlightedId: number;
    paths: PathData[];
    sphereGeometry: SphereBufferGeometry;
    membrane: any;
    mlogger: any;
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    controls: OrbitControls;
    dl: DirectionalLight;
    boundingBox: Box3;
    boundingBoxMesh: Box3Helper;
    loadObj: Function;
    hemiLight: HemisphereLight;
    private errorMesh;
    constructor(loggerLevel: any);
    readonly logger: any;
    lastNumberOfAgents: number;
    readonly renderDom: HTMLElement;
    updateBoxSize(trajectoryData: any): void;
    resetCamera(): void;
    getFollowObject(): Object3D | null;
    setFollowObject(obj: Object3D | null): void;
    unfollow(): void;
    setHighlightById(id: any): void;
    dehighlight(): void;
    onNewRuntimeGeometryType(meshName: any): void;
    setUpControls(element: any): void;
    /**
     *   Setup ThreeJS Scene
     * */
    setupScene(): void;
    resize(width: any, height: any): void;
    reparent(parent: any): void;
    disableControls(): void;
    enableControls(): void;
    render(time: any): void;
    /**
     *   Run Time Mesh functions
     */
    createMaterials(colors: any): void;
    createMeshes(): void;
    addMesh(meshName: any, mesh: any): void;
    getMesh(index: any): Mesh;
    resetMesh(index: any, obj: any): void;
    getFiberMesh(name: string): Mesh;
    getMaterial(index: any, typeId: any): Material;
    /**
     *   Data Management
     */
    resetMapping(): void;
    /**
     *   Map Type ID -> Geometry
     */
    mapIdToGeom(id: any, meshName: any): void;
    getGeomFromId(id: number): Mesh | null;
    mapFromJSON(name: any, filePath: any, callback?: any): Promise<any>;
    resetBounds(boundsAsArray: any): void;
    setScaleForId(id: number, scale: number): void;
    getScaleForId(id: number): number;
    /**
     *   Default Geometry
     */
    getSphereGeom(): BufferGeometry | Geometry;
    /**
     *   Update Scene
     * */
    updateScene(agents: any): void;
    setupMeshGeometry(i: any, runtimeMesh: any, meshGeom: any, isFollowedObject: any): Mesh;
    assignMaterial(runtimeMesh: Object3D, material: MeshBasicMaterial | LineBasicMaterial): void;
    assignMembraneMaterial(runtimeMesh: any): void;
    getMaterialOfAgentIndex(idx: any): MeshBasicMaterial | undefined;
    findPathForAgentIndex(idx: any): PathData | null;
    removePathForObject(obj: any): void;
    addPathForObject(obj: any): void;
    addPathForAgentIndex(idx: any, maxSegments?: number, color?: any): PathData;
    removePathForAgentIndex(idx: any): void;
    addPointToPath(path: any, x: any, y: any, z: any, dx: any, dy: any, dz: any): void;
    setShowPaths(showPaths: any): void;
    setShowMeshes(showMeshes: any): void;
    setShowBounds(showBounds: any): void;
    showPathForAgentIndex(idx: any, visible: any): void;
    hideUnusedMeshes(numberOfAgents: any): void;
    hideUnusedFibers(numberOfFibers: any): void;
    clear(): void;
    resetAllGeometry(): void;
    update(agents: any): void;
}
export { VisGeometry };
export default VisGeometry;
