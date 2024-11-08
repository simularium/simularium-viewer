import { forEach } from "lodash";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import jsLogger, { ILogger, ILogLevel } from "js-logger";
import { LoadSpec, VolumeLoaderContext } from "@aics/volume-viewer";
import {
    BufferGeometry,
    Object3D,
    Mesh,
    SphereGeometry,
    BoxGeometry,
} from "three";

import { checkAndSanitizePath, getFileExtension } from "../util";
import PDBModel from "./PDBModel";
import { InstancedMesh, InstanceType } from "./rendering/InstancedMesh";
import TaskQueue from "../simularium/TaskQueue";
import { AgentTypeVisData } from "../simularium/types";

import {
    AgentGeometry,
    GeometryDisplayType,
    GeometryStoreLoadResponse,
    MeshGeometry,
    MeshLoadRequest,
} from "./types";
import { MetaballMesh } from "./rendering/MetaballMesh";
import VolumeModel from "./VolumeModel";

export const DEFAULT_MESH_NAME = "SPHERE";

type Registry = Map<string, AgentGeometry>;

class GeometryStore {
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
    private _geoLoadAttempted: Map<string, boolean>;
    private _cachedAssets: Map<string, string>;
    private _registry: Registry;
    private volumeLoaderContext?: VolumeLoaderContext;
    public mlogger: ILogger;
    public static sphereGeometry: SphereGeometry = new SphereGeometry(
        1,
        32,
        32
    );
    public static cubeGeometry: BoxGeometry = new BoxGeometry(1, 1, 1);

    private static shouldLoadPrimitive = (
        displayType: GeometryDisplayType,
        url?: string
    ) => {
        if (!url) {
            // if there isn't an url to load, even if they selected PDB or OBJ
            // we have to default to a sphere. May change depending on how we handle the gizmo
            return true;
        }
        if (
            displayType === GeometryDisplayType.PDB ||
            displayType === GeometryDisplayType.OBJ ||
            displayType === GeometryDisplayType.VOLUME
        ) {
            return false;
        }
        return true;
    };

    constructor(loggerLevel?: ILogLevel) {
        this._geoLoadAttempted = new Map<string, boolean>();
        this._cachedAssets = new Map<string, string>();
        this._registry = new Map<string, AgentGeometry>();
        this.mlogger = jsLogger.get("geometry-store");
        this._registry.set(DEFAULT_MESH_NAME, {
            displayType: GeometryDisplayType.SPHERE,
            geometry: {
                mesh: new Mesh(GeometryStore.sphereGeometry),
                cancelled: false,
                instances: new InstancedMesh(
                    InstanceType.MESH,
                    GeometryStore.sphereGeometry,
                    DEFAULT_MESH_NAME,
                    1
                ),
            },
        });
        if (loggerLevel) {
            this.mlogger.setLevel(loggerLevel);
        }
    }

    public reset(): void {
        this._geoLoadAttempted.clear();
        this._registry.clear();
        this._registry.set(DEFAULT_MESH_NAME, {
            displayType: GeometryDisplayType.SPHERE,
            geometry: {
                mesh: new Mesh(GeometryStore.sphereGeometry),
                cancelled: false,
                instances: new InstancedMesh(
                    InstanceType.MESH,
                    GeometryStore.sphereGeometry,
                    DEFAULT_MESH_NAME,
                    1
                ),
            },
        });
    }

    public get registry(): Registry {
        return this._registry;
    }

    public forEachMesh(iteratee: (geo: MeshGeometry) => void): void {
        // forEach method for manipulating ThreeJs Mesh objects
        this._registry.forEach((value) => {
            const { displayType } = value;
            if (
                displayType !== GeometryDisplayType.PDB &&
                displayType !== GeometryDisplayType.VOLUME
            ) {
                const agentGeo = value as MeshGeometry;
                iteratee(agentGeo);
            }
        });
    }

    public forEachPDB(iteratee: (geo: PDBModel) => void): void {
        // forEach method for manipulating ThreeJs Mesh objects
        this._registry.forEach((value) => {
            const { displayType } = value;
            if (displayType === GeometryDisplayType.PDB) {
                const agentGeo = value.geometry as PDBModel;
                iteratee(agentGeo);
            }
        });
    }

    public getGeoForAgentType(entryName: string): AgentGeometry | null {
        const geo = this._registry.get(entryName);
        return geo || null;
    }

    public cancelAll(): void {
        // note that this leaves cancelled things in the registries.
        // This should be called before the registries are cleared and probably
        // only makes sense to do if they are indeed about to be cleared.

        // don't process any queued requests
        TaskQueue.stopAll();
        // signal to cancel any pending geometries
        this._registry.forEach((value) => {
            value.geometry.cancelled = true;
        });
    }

    public cacheLocalAssets(assets: { [key: string]: string }): void {
        // store local files as data strings until they're ready to be
        // parsed as geometry.
        forEach(assets, (value, key) => {
            const path = checkAndSanitizePath(key);
            this._cachedAssets.set(path, value);
        });
    }

    private createNewSphereGeometry(meshName: string): MeshLoadRequest {
        /** create new default geometry */
        return {
            mesh: new Mesh(GeometryStore.sphereGeometry),
            cancelled: false,
            instances: new InstancedMesh(
                InstanceType.MESH,
                GeometryStore.sphereGeometry,
                meshName,
                1
            ),
        };
    }

    private createNewCubeGeometry(meshName: string): MeshLoadRequest {
        return {
            mesh: new Mesh(GeometryStore.cubeGeometry),
            cancelled: false,
            instances: new InstancedMesh(
                InstanceType.MESH,
                GeometryStore.cubeGeometry,
                meshName,
                1
            ),
        };
    }

    private setGeometryInRegistry(
        key: string,
        geometry,
        displayType: GeometryDisplayType
    ) {
        this._registry.set(key, {
            geometry,
            displayType,
        });
    }

    private async fetchPdb(url: string): Promise<PDBModel | undefined> {
        /** Downloads a PDB from an external source */

        const pdbModel = new PDBModel(url);
        this.setGeometryInRegistry(url, pdbModel, GeometryDisplayType.PDB);
        let actualUrl = url.slice();
        let pdbID = "";
        if (!actualUrl.startsWith("http")) {
            // assume this is a PDB ID to be loaded from the actual PDB
            // if not a valid ID, then download will fail.
            pdbID = actualUrl;
            // prefer mmCIF first. If this fails, we will try .pdb.
            // TODO:
            // Can we confirm that the rcsb.org servers have every id as a cif file?
            // If so, then we don't need to do this second try and we can always use .cif.
            actualUrl = `https://files.rcsb.org/download/${pdbID}-assembly1.cif`;
        }

        let data: string;
        const response = await fetch(actualUrl);
        if (response.ok) {
            data = await response.text();
        } else if (pdbID) {
            // try again as pdb
            actualUrl = `https://files.rcsb.org/download/${pdbID}.pdb1`;
            const response = await fetch(actualUrl);
            if (!response.ok) {
                // error will be caught by the function that calls this
                throw new Error(
                    `Failed to fetch ${pdbModel.filePath} from ${actualUrl}`
                );
            }
            data = await response.text();
        } else {
            // error will be caught by function that calls this
            throw new Error(`Failed to fetch ${pdbModel.filePath} from ${url}`);
        }

        if (pdbModel.cancelled) {
            this._registry.delete(url);
            return undefined;
        }
        pdbModel.parse(data, getFileExtension(actualUrl));
        const pdbEntry = this._registry.get(url);
        if (pdbEntry && pdbEntry.geometry === pdbModel) {
            this.mlogger.info("Finished downloading pdb: ", url);
            return pdbModel;
        } else {
            // This seems like some kind of terrible error if we get here.
            // Alternatively, we could try re-adding the registry entry.
            // Or reject.
            this.mlogger.warn(
                `After download, GeometryStore PDB entry not found for ${url}`
            );
            return undefined;
        }
    }

    private prepMeshRegistryForNewObj(meshName: string): void {
        /** Create a place in the registry to store the new object registered to meshName */
        if (this._registry.has(meshName)) {
            const entry = this._registry.get(meshName);
            if (!entry) {
                return; // should be unreachable, but needed for TypeScript
            }
            const { geometry, displayType } = entry;
            if (
                geometry &&
                displayType !== GeometryDisplayType.PDB &&
                displayType !== GeometryDisplayType.SPHERE_GROUP
            ) {
                const meshRequest = geometry as MeshLoadRequest;
                // there is already a mesh registered but we are going to load a new one.
                // start by resetting this entry to a sphere. we will replace when the new mesh arrives
                meshRequest.mesh = new Mesh(GeometryStore.sphereGeometry);
                meshRequest.instances.replaceGeometry(
                    GeometryStore.sphereGeometry,
                    meshName
                );
            }
        } else {
            // if this mesh is not yet registered, then start off as a sphere
            // we will replace the sphere in here with the real geometry when it arrives.
            this.setGeometryInRegistry(
                meshName,
                this.createNewSphereGeometry(meshName),
                GeometryDisplayType.SPHERE
            );
        }
    }

    private handleObjResponse(
        meshName: string,
        object: Object3D
    ): MeshLoadRequest | undefined {
        const item = this._registry.get(meshName);
        if (!item) {
            return; // should be unreachable, but needed for TypeScript
        }
        const meshLoadRequest = item.geometry as MeshLoadRequest;
        if (
            (meshLoadRequest && meshLoadRequest.cancelled) ||
            !meshLoadRequest
        ) {
            this._registry.delete(meshName);
            return;
        }

        this.mlogger.debug("Finished loading mesh: ", meshName);
        // insert new mesh into meshRegistry
        // get its geometry first
        // (note that we are only returning the first geometry found):
        let geom: BufferGeometry | null = null;
        object.traverse((obj) => {
            if (!geom && obj instanceof Mesh) {
                geom = (obj as Mesh).geometry;
                return false;
            }
        });
        if (geom) {
            // now replace the geometry in the existing mesh registry entry
            meshLoadRequest.mesh = object;
            meshLoadRequest.instances.replaceGeometry(geom, meshName);
        } else {
            console.error(
                "Mesh loaded but could not find instanceable geometry in it"
            );
        }
        if (!object.name) {
            object.name = meshName;
        }
        return meshLoadRequest;
    }

    private fetchObj(url: string): Promise<MeshLoadRequest> {
        /** Request an obj from an external source */
        const objLoader = new OBJLoader();
        this.prepMeshRegistryForNewObj(url);
        return new Promise((resolve, reject) => {
            try {
                objLoader.load(
                    url,
                    (object: Object3D) => {
                        const meshLoadRequest = this.handleObjResponse(
                            url,
                            object
                        );
                        if (meshLoadRequest) {
                            resolve(meshLoadRequest);
                        } else {
                            reject(`Failed to load mesh, or cancelled: ${url}`);
                        }
                    },
                    (xhr) => {
                        this.mlogger.info(
                            url,
                            " ",
                            `${(xhr.loaded / xhr.total) * 100}% loaded`
                        );
                    },
                    (error) => {
                        // if the request fails, leave agent as a sphere by default
                        this.mlogger.warn("Failed to load mesh: ", error, url);
                        reject(`Failed to load mesh: ${url}`);
                    }
                );
            } catch {
                reject(`Failed to load mesh: ${url}`);
            }
        });
    }

    /** Don't start a volume load worker until we know we need it */
    private async getVolumeLoaderContext(): Promise<VolumeLoaderContext> {
        if (!this.volumeLoaderContext) {
            // TODO this is missing optional config properties:
            //   `maxCacheSize`, `maxActiveRequests`, `maxLowPriorityRequests`.
            //   Do we want to set our own values for these?
            this.volumeLoaderContext = new VolumeLoaderContext();
            await this.volumeLoaderContext.onOpen();
        }
        return this.volumeLoaderContext;
    }

    private async fetchVolume(url: string): Promise<VolumeModel> {
        // TODO should this be in a worker? Are we already in a worker here?
        //   Should this class get a `VolumeLoaderContext` going?
        const model = new VolumeModel();
        this.setGeometryInRegistry(url, model, GeometryDisplayType.VOLUME);
        const context = await this.getVolumeLoaderContext();
        const loader = await context.createLoader(url);
        loader.syncMultichannelLoading(true);
        const loadCallback = model.onChannelLoaded.bind(model);
        const volume = await loader.createVolume(new LoadSpec(), loadCallback);
        model.setImage(volume);
        model.loadInitialData();
        return model;
    }

    /**
     * Load new geometry if necessary, ie this geometry hasn't already
     * been loaded or attempted and failed to be loaded.
     *
     * If it's already been attempted, or is already in the registry,
     * this will return Promise<undefined>
     *
     * Otherwise, it first checks the cache, and then tries to load via
     * a url. If provided a url and the loading fails, the geometry is replaced
     * by default geometry (sphere), and the user is notified.
     */
    private async attemptToLoadGeometry(
        urlOrPath: string,
        displayType: GeometryDisplayType
    ): Promise<PDBModel | MeshLoadRequest | VolumeModel | undefined> {
        if (this._cachedAssets.has(urlOrPath)) {
            // if it's in the cached assets, parse the data
            // store it in the registry, and return it
            const file = this._cachedAssets.get(urlOrPath);
            let geometry: PDBModel | MeshLoadRequest | undefined;
            if (file && displayType === GeometryDisplayType.PDB) {
                const pdbModel = new PDBModel(urlOrPath);
                pdbModel.parse(file, getFileExtension(urlOrPath));
                this.setGeometryInRegistry(urlOrPath, pdbModel, displayType);
                geometry = pdbModel;
            } else if (file && displayType === GeometryDisplayType.OBJ) {
                // stores the name in the registry
                this.prepMeshRegistryForNewObj(urlOrPath);
                const objLoader = new OBJLoader();
                const object = objLoader.parse(file);
                geometry = this.handleObjResponse(urlOrPath, object);
            }
            // make sure we know not to try to load it from the url
            this._geoLoadAttempted.set(urlOrPath, true);
            // don't need to store file data once it's loaded into registry
            this._cachedAssets.delete(urlOrPath);
            if (!geometry) {
                // will replace geom in registry is sphere
                throw new Error(
                    `Tried to load from cache ${urlOrPath}, but something went wrong, check that the file formats provided match the displayType`
                );
            }
            return geometry;
        } else if (
            !this._registry.has(urlOrPath) &&
            !this._geoLoadAttempted.get(urlOrPath)
        ) {
            this._geoLoadAttempted.set(urlOrPath, true);
            switch (displayType) {
                case GeometryDisplayType.PDB:
                    return await this.fetchPdb(urlOrPath);
                case GeometryDisplayType.OBJ:
                    return await this.fetchObj(urlOrPath);
                case GeometryDisplayType.VOLUME:
                    return await this.fetchVolume(urlOrPath);
                default:
                    // will replace geom in registry is sphere
                    throw new Error(
                        `Don't know how to load this geometry: ${displayType}, ${urlOrPath}`
                    );
            }
        }
        // already loaded or attempted to load this geometry
        return undefined;
    }

    public async mapKeyToGeom(
        id: number,
        agentVisData: AgentTypeVisData
    ): Promise<GeometryStoreLoadResponse | undefined> {
        /**
         * stores meshName --> actual mesh, returns a Promise.
         * If Promise caches, the geometry is replaced with a sphere
         * and the user is notified.
         */
        const { displayType, url } = agentVisData;
        this.mlogger.debug(`Geo for id ${id} set to '${url}'`);

        if (GeometryStore.shouldLoadPrimitive(displayType, url)) {
            const lookupKey = displayType;
            let geometry: MeshLoadRequest;
            // TODO: handle gizmo here
            if (displayType === GeometryDisplayType.SPHERE_GROUP) {
                // instances in this case will be a simple array of MarchingCubes objects.
                // clear in between redraws?
                // on updatescene, add instances
                // on render, pass the group of marchingcubes objects
                geometry = {
                    // the mesh should be ignored for SphereGroup
                    mesh: new Object3D(),
                    cancelled: false,
                    instances: new MetaballMesh(lookupKey),
                } as MeshLoadRequest;

                this.setGeometryInRegistry(lookupKey, geometry, displayType);
            } else if (displayType === GeometryDisplayType.CUBE) {
                geometry = this.createNewCubeGeometry(lookupKey);
                this.setGeometryInRegistry(
                    lookupKey,
                    geometry,
                    GeometryDisplayType.CUBE
                );
            } else {
                // default to a sphere
                geometry = this.createNewSphereGeometry(lookupKey);
                this.setGeometryInRegistry(
                    lookupKey,
                    geometry,
                    GeometryDisplayType.SPHERE
                );
            }
            return { geometry };
        } else {
            // Handle request for non primitive geometry
            const lookupKey = checkAndSanitizePath(url);
            try {
                const geometry = await this.attemptToLoadGeometry(
                    lookupKey,
                    displayType
                );
                if (geometry) {
                    return { geometry };
                }
            } catch (e) {
                // if anything goes wrong, add a new sphere to the registry
                // using this same lookup key
                const geometry = this.createNewSphereGeometry(lookupKey);
                this.setGeometryInRegistry(
                    lookupKey,
                    geometry,
                    GeometryDisplayType.SPHERE
                );
                return {
                    geometry,
                    displayType: GeometryDisplayType.SPHERE,
                    errorMessage: (e as Error)?.message || (e as string),
                };
            }
        }
    }
}

export default GeometryStore;
