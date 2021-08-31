import { forEach } from "lodash";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

import { BufferGeometry, Object3D, Mesh } from "three";
import { checkAndSanitizePath } from "../../util";
import PDBModel from "../PDBModel";
import { InstancedMesh } from "../rendering/InstancedMesh";
import VisAgent from "../VisAgent";
import {
    AgentGeometry,
    GeometryDisplayType,
    GeometryStoreLoadResponse,
    MeshGeometry,
    MeshLoadRequest,
} from "./types";
import TaskQueue from "../worker/TaskQueue";
import { AgentTypeVisData } from "../types";

export const DEFAULT_MESH_NAME = "SPHERE";

type Registry = Map<string, AgentGeometry>;

class GeometryStore {
    private geoLoadAttempted: Map<string, boolean>;
    private _cachedAssets: Map<string, string>;
    private _registry: Registry;

    constructor() {
        this.geoLoadAttempted = new Map<string, boolean>();
        this._cachedAssets = new Map<string, string>();
        this._registry = new Map<string, AgentGeometry>();
    }

    public init(): void {
        this._registry.clear();
        this._registry.set(DEFAULT_MESH_NAME, {
            displayType: GeometryDisplayType.SPHERE,
            geometry: {
                mesh: new Mesh(VisAgent.sphereGeometry),
                cancelled: false,
                instances: new InstancedMesh(
                    VisAgent.sphereGeometry,
                    DEFAULT_MESH_NAME,
                    1
                ),
            },
        });
    }

    public get registry(): Registry {
        return this._registry;
    }

    public updateMeshes(): void {
        this._registry.forEach((value) => {
            const { displayType } = value;
            if (displayType !== GeometryDisplayType.PDB) {
                const agentGeo = value as MeshGeometry;
                agentGeo.geometry.instances.beginUpdate();
            }
        });
    }

    public endUpdateMeshes(): void {
        this._registry.forEach((value) => {
            const { displayType } = value;
            if (displayType !== GeometryDisplayType.PDB) {
                const agentGeo = value as MeshGeometry;
                agentGeo.geometry.instances.endUpdate();
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
        // signal to cancel any pending pdbs
        this._registry.forEach((value) => {
            value.geometry.cancelled = true;
        });
    }

    public cacheLocalAssets(assets: { [key: string]: string }): void {
        forEach(assets, (value, key) => {
            const path = checkAndSanitizePath(key);
            this._cachedAssets.set(path, value);
        });
    }

    private getNewSphereGeometry(meshName: string): MeshLoadRequest {
        return {
            mesh: new Mesh(VisAgent.sphereGeometry),
            cancelled: false,
            instances: new InstancedMesh(VisAgent.sphereGeometry, meshName, 1),
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

    /** Downloads a PDB from an external source */
    private fetchPdb(url: string): Promise<PDBModel | undefined> {
        const pdbModel = new PDBModel(url);
        this.setGeometryInRegistry(url, pdbModel, GeometryDisplayType.PDB);
        return fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch ${pdbModel.filePath} from ${url}`
                    );
                }
                return response.text();
            })
            .then((data) => {
                if (pdbModel.cancelled) {
                    this._registry.delete(url);
                    return Promise.resolve(undefined);
                }
                pdbModel.parsePDBData(data);
                const pdbEntry = this._registry.get(url);
                if (pdbEntry && pdbEntry.geometry === pdbModel) {
                    // this.logger.debug("Finished downloading pdb: ", url);

                    return pdbModel;
                } else {
                    // TODO: what should happen here?
                }
            });
    }

    private prepMeshRegistryForNewObj(meshName: string): void {
        if (this._registry.has(meshName)) {
            const entry = this._registry.get(meshName);
            if (!entry) {
                return;
            }
            const { geometry, displayType } = entry;
            if (geometry && displayType !== GeometryDisplayType.PDB) {
                const meshRequest = geometry as MeshLoadRequest;
                // there is already a mesh registered but we are going to load a new one.
                // start by resetting this entry to a sphere. we will replace when the new mesh arrives
                meshRequest.mesh = new Mesh(VisAgent.sphereGeometry);
                meshRequest.instances.replaceGeometry(
                    VisAgent.sphereGeometry,
                    meshName
                );
            }
        } else {
            // if this mesh is not yet registered, then start off as a sphere
            // we will replace the sphere in here with the real geometry when it arrives.
            this.setGeometryInRegistry(
                meshName,
                this.getNewSphereGeometry(meshName),
                GeometryDisplayType.SPHERE
            );
        }
    }

    private handleObjResponse(meshName: string, object: Object3D): void {
        const item = this._registry.get(meshName);
        if (!item) {
            // should be unreachable, but needed for TypeScript
            return;
        }
        const meshLoadRequest = item.geometry as MeshLoadRequest;
        if (
            (meshLoadRequest && meshLoadRequest.cancelled) ||
            !meshLoadRequest
        ) {
            this._registry.delete(meshName);
            return;
        }

        // this.logger.debug("Finished loading mesh: ", meshName);
        // insert new mesh into meshRegistry
        // get its geometry first:
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
    }

    private fetchObj(url: string): Promise<Object3D> {
        const objLoader = new OBJLoader();
        this.prepMeshRegistryForNewObj(url);
        return new Promise((resolve, reject) => {
            objLoader.load(
                url,
                (object) => {
                    this.handleObjResponse(url, object);
                    resolve(object);
                },
                () => {
                    // this.logger.debug(
                    //     url,
                    //     " ",
                    //     `${(xhr.loaded / xhr.total) * 100}% loaded`
                    // );
                },
                () => {
                    // if the request fails, leave agent as a sphere by default
                    // this.logger.debug("Failed to load mesh: ", error, url);
                    return reject(`Failed to load mesh: ${url}`);
                }
            );
        });
    }

    private attemptToLoadGeometry(
        urlOrPath: string,
        displayType: GeometryDisplayType
    ): Promise<PDBModel | MeshLoadRequest | undefined> {
        if (this._cachedAssets.has(urlOrPath)) {
            const file = this._cachedAssets.get(urlOrPath);
            let geometry;
            if (file && displayType === GeometryDisplayType.PDB) {
                const pdbModel = new PDBModel(urlOrPath);
                pdbModel.parsePDBData(file);
                this.setGeometryInRegistry(urlOrPath, pdbModel, displayType);
                geometry = pdbModel;
            } else if (file && displayType === GeometryDisplayType.OBJ) {
                // stores the name in the registry
                this.prepMeshRegistryForNewObj(urlOrPath);
                const objLoader = new OBJLoader();
                const object = objLoader.parse(file);
                this.handleObjResponse(urlOrPath, object);
                geometry = object;
            }
            this.geoLoadAttempted.set(urlOrPath, true);
            // don't need to store file data once it's loaded into registry
            this._cachedAssets.delete(urlOrPath);
            if (!geometry) {
                // will replace geom in registry is sphere
                return Promise.reject(
                    `Tried to load from cache ${urlOrPath}, but something went wrong, check that the file formats provided match the displayType`
                );
            }
            return Promise.resolve(geometry);
        } else if (
            !this._registry.has(urlOrPath) &&
            !this.geoLoadAttempted.get(urlOrPath)
        ) {
            this.geoLoadAttempted.set(urlOrPath, true);
            switch (displayType) {
                case GeometryDisplayType.PDB:
                    return this.fetchPdb(urlOrPath).then((pdbModel) => {
                        return pdbModel;
                    });
                case GeometryDisplayType.OBJ:
                    return this.fetchObj(urlOrPath).then((object) => {
                        return object;
                    });
                default:
                    // will replace geom in registry is sphere
                    return Promise.reject(
                        `Don't know how to load this geometry: 
                        ${displayType},
                        ${urlOrPath}`
                    );
            }
        }
        // already loaded or attempted to load this geometry
        return Promise.resolve(undefined);
    }
    /**
     * stores meshName --> actual mesh
     */
    public async mapKeyToGeom(
        id: number,
        geometry: AgentTypeVisData
    ): Promise<GeometryStoreLoadResponse | undefined> {
        const { displayType, color, url } = geometry;
        // this.logger.debug(`Geo for id ${id} set to '${url}'`);
        const isMesh = displayType === GeometryDisplayType.OBJ;
        const isPDB = displayType === GeometryDisplayType.PDB;
        console.log(color); // TODO: handle color
        if (!url) {
            // displayType not either pdb or obj, will show a sphere
            // TODO: handle CUBE, GIZMO etc
            return Promise.resolve(undefined);
        }
        const lookupKey = checkAndSanitizePath(url);

        if (isMesh || isPDB) {
            return this.attemptToLoadGeometry(lookupKey, displayType)
                .then((geometry) => {
                    if (geometry) {
                        return {
                            geometry,
                        };
                    }
                })
                .catch((e) => {
                    // if anything goes wrong, add a new sphere to the registry
                    // using this same lookup key
                    const geometry = this.getNewSphereGeometry(lookupKey);
                    this.setGeometryInRegistry(
                        lookupKey,
                        geometry,
                        GeometryDisplayType.SPHERE
                    );
                    return Promise.resolve({
                        geometry,
                        displayType: GeometryDisplayType.SPHERE,
                        errorMessage: e,
                    });
                });
        }
    }
}

export default GeometryStore;
