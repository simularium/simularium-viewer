declare class VisGeometry {
    handleTrajectoryData: any;
    visGeomMap: any;
    meshRegistry: Map<any, any>;
    meshLoadAttempted: Map<any, any>;
    scaleMapping: Map<any, any>;
    geomCount: number;
    materials: any;
    desatMaterials: any;
    highlightMaterial: any;
    followObject: any;
    runTimeMeshes: any;
    runTimeFiberMeshes: any;
    mlastNumberOfAgents: number;
    colorVariant: number;
    fixLightsToCamera: boolean;
    highlightedId: any;
    paths: any;
    sphereGeometry: any;
    membrane: any;
    mlogger: any;
    renderer: any;
    scene: any;
    camera: any;
    controls: any;
    dl: any;
    boundingBox: any;
    boundingBoxMesh: any;
    loadObj: any;
    hemiLight: any;
    constructor(loggerLevel: any);
    readonly logger: any;
    lastNumberOfAgents: number;
    readonly renderDom: any;
    updateBoxSize(trajectoryData: any): void;
    resetCamera(): void;
    getFollowObject(): any;
    setFollowObject(obj: any): void;
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
    getMesh(index: any): any;
    resetMesh(index: any, obj: any): void;
    getFiberMesh(name: any): any;
    getMaterial(index: any, typeId: any): any;
    /**
    *   Data Management
    */
    resetMapping(): void;
    /**
    *   Map Type ID -> Geometry
    */
    mapIdToGeom(id: any, meshName: any): void;
    getGeomFromId(id: any): any;
    mapFromJSON(name: any, filePath: any, callback: any): Promise<void>;
    resetBounds(boundsAsArray: any): void;
    setScaleForId(id: any, scale: any): void;
    getScaleForId(id: any): any;
    /**
    *   Default Geometry
    */
    getSphereGeom(): any;
    /**
    *   Update Scene
    * */
    updateScene(agents: any): void;
    setupMeshGeometry(i: any, runtimeMesh: any, meshGeom: any, isFollowedObject: any): any;
    assignMaterial(runtimeMesh: any, material: any): void;
    assignMembraneMaterial(runtimeMesh: any): void;
    getMaterialOfAgentIndex(idx: any): any;
    findPathForAgentIndex(idx: any): any;
    removePathForObject(obj: any): void;
    addPathForObject(obj: any): void;
    addPathForAgentIndex(idx: any, maxSegments?: number, color?: any): any;
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
