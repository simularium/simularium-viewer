import { ILogger, ILogLevel } from "js-logger";
import { SphereBufferGeometry, BoxBufferGeometry } from "three";
import PDBModel from "./PDBModel";
import { AgentTypeVisData } from "../simularium/types";
import { AgentGeometry, GeometryStoreLoadResponse, MeshGeometry } from "./types";
export declare const DEFAULT_MESH_NAME = "SPHERE";
declare type Registry = Map<string, AgentGeometry>;
declare class GeometryStore {
    /**
     * Stores Key --> GeometryData Map
     * Key can be a file name or a url (any unique string).
     *
     * Handles fetching the geometry data from an external source via
     * urls or a local file that was loaded directly into the viewer and returns the
     * resulting data as a promise.
     *
     * Won't fetch the same geometry twice for the same trajectory.
     *
     * Should be cleared out with each new trajectory loaded.
     *
     * There is a helper function for modifying meshes, but otherwise this is
     * just a store module, it doesn't know anything about the trajectory or
     * agent ids, or do anything with the geometries other than load and store them.
     */
    private _geoLoadAttempted;
    private _cachedAssets;
    private _registry;
    mlogger: ILogger;
    static sphereGeometry: SphereBufferGeometry;
    static cubeGeometry: BoxBufferGeometry;
    private static shouldLoadPrimitive;
    constructor(loggerLevel?: ILogLevel);
    reset(): void;
    get registry(): Registry;
    forEachMesh(iteratee: (geo: MeshGeometry) => void): void;
    forEachPDB(iteratee: (geo: PDBModel) => void): void;
    getGeoForAgentType(entryName: string): AgentGeometry | null;
    cancelAll(): void;
    cacheLocalAssets(assets: {
        [key: string]: string;
    }): void;
    private createNewSphereGeometry;
    private createNewCubeGeometry;
    private setGeometryInRegistry;
    private fetchPdb;
    private prepMeshRegistryForNewObj;
    private handleObjResponse;
    private fetchObj;
    private attemptToLoadGeometry;
    mapKeyToGeom(id: number, agentVisData: AgentTypeVisData): Promise<GeometryStoreLoadResponse | undefined>;
}
export default GeometryStore;
