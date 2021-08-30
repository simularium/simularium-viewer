import { forEach, noop } from "lodash";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

import { BufferGeometry, Object3D, Mesh } from "three";
import { checkAndSanitizePath } from "../../util";
import PDBModel from "../PDBModel";
import { InstancedMesh } from "../rendering/InstancedMesh";
import VisAgent from "../VisAgent";
import { REASON_CANCELLED } from "../worker/TaskQueue";
import {
    AgentGeometry,
    AgentTypeGeometry,
    GeometryDisplayType,
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
    private onNewRuntimeGeometry = (
        name: string,
        displayType: GeometryDisplayType,
        data: PDBModel | MeshLoadRequest
    ) => noop;

    constructor(handleNewGeoCallback) {
        this.geoLoadAttempted = new Map<string, boolean>();
        this._cachedAssets = new Map<string, string>();
        this._registry = new Map<string, AgentGeometry>();
        this.onNewRuntimeGeometry = handleNewGeoCallback;
    }

    public init() {
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
            if (value.geometry.instances) {
                value.instances.beginUpdate();
            }
        });
    }

    public endUpdateMeshes(): void {
        this._registry.forEach((value) => {
            if (value.geometry.instances) {
                value.instances.endUpdate();
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

    /** Loads pdb model and updates scene. The urlorPath variable is used here as
     * an identifier key, not to access the geometry. This function can be called with
     * either locally loaded geometry or a fetch response
     */
    private loadPdb(urlOrPath: string, pdbModel: PDBModel): void {
        // called after the geo is stored
        this.onNewRuntimeGeometry(urlOrPath, GeometryDisplayType.PDB, pdbModel);
        // initiate async LOD processing
        pdbModel.generateLOD().then(() => {
            this.logger.debug("Finished loading pdb LODs: ", urlOrPath);
            this.onNewRuntimeGeometry(
                urlOrPath,
                GeometryDisplayType.PDB,
                pdbModel
            );
        });
    }

    /** Downloads a PDB from an external source */
    private fetchPdb(url: string): Promise<void> {
        const pdbmodel = new PDBModel(url);
        this._registry.set(url, {
            geometry: pdbmodel,
            displayType: GeometryDisplayType.PDB,
        });
        return pdbmodel.download(url).then(
            () => {
                const pdbEntry = this._registry.get(url);
                if (
                    pdbEntry &&
                    pdbEntry.geometry === pdbmodel &&
                    !pdbEntry.geometry.isCancelled()
                ) {
                    // this.logger.debug("Finished downloading pdb: ", url);

                    this.loadPdb(url, pdbmodel);
                }
            }
            // (reason) => {
            //     this.pdbRegistry.delete(url);
            //     if (reason !== REASON_CANCELLED) {
            //         this.logger.debug("Failed to load pdb: ", url);

            //         this.onError(
            //             `Failed to fetch PDB file:
            //                 ${url}.
            //                 Showing spheres for this geometry instead`
            //         );
            //         const ids = this.getAllTypeIdsForGeometryName(url);
            //         forEach(ids, (id) => {
            //             this.visGeomMap.set(id, {
            //                 name: DEFAULT_MESH_NAME,
            //                 // should use SPHERE here?
            //                 displayType: GeometryDisplayType.OBJ,
            //             });
            //         });
            //     }
            // }
        );
    }

    private prepMeshRegistryForNewObj(meshName: string): void {
        if (this._registry.has(meshName)) {
            const entry = this._registry.get(meshName);
            if (!entry) {
                return;
            }
            const { geometry, displayType } = entry;
            if (geometry && displayType === GeometryDisplayType.OBJ) {
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
        const meshLoadRequest = item?.geometry as MeshLoadRequest;
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

    private fetchObj(url: string): void {
        const objLoader = new OBJLoader();
        this.prepMeshRegistryForNewObj(url);
        return objLoader.load(
            url,
            (object) => {
                this.handleObjResponse(url, object);
            },
            (xhr) => {
                // this.logger.debug(
                //     url,
                //     " ",
                //     `${(xhr.loaded / xhr.total) * 100}% loaded`
                // );
            },
            (error) => {
                // if the request fails, leave agent as a sphere by default
                // this.logger.debug("Failed to load mesh: ", error, url);
                return Promise.reject(`Failed to load mesh: ${url}`);
            }
        );
    }

    private attemptToLoadGeometry(
        urlOrPath: string,
        displayType: GeometryDisplayType
    ) {
        if (this._cachedAssets.has(urlOrPath)) {
            const file = this._cachedAssets.get(urlOrPath);
            if (file && displayType === GeometryDisplayType.PDB) {
                const pdbModel = new PDBModel(urlOrPath);
                pdbModel.parsePDBData(file);
                this.setGeometryInRegistry(urlOrPath, pdbModel, displayType);
                this.loadPdb(urlOrPath, pdbModel);
            } else if (file && displayType === GeometryDisplayType.OBJ) {
                // stores the name in the registry
                this.prepMeshRegistryForNewObj(urlOrPath);
                const objLoader = new OBJLoader();
                const object = objLoader.parse(file);
                this.handleObjResponse(urlOrPath, object);
            }
            this.geoLoadAttempted.set(urlOrPath, true);
            // don't need to store file data once it's loaded into registry
            this._cachedAssets.delete(urlOrPath);
        } else if (
            !this._registry.has(urlOrPath) &&
            !this.geoLoadAttempted.get(urlOrPath)
        ) {
            this.geoLoadAttempted.set(urlOrPath, true);
            switch (displayType) {
                case GeometryDisplayType.PDB:
                    return this.fetchPdb(urlOrPath);
                case GeometryDisplayType.OBJ:
                    return this.fetchObj(urlOrPath);
                default:
                    console.error(
                        "Don't know how to load this geometry: ",
                        displayType,
                        urlOrPath
                    );
                    break;
            }
        }
    }
    /**
     * Then meshName --> actual mesh, via meshRegistry (or pdbRegistry)
     */
    public mapKeyToGeom(id: number, geometry: AgentTypeVisData): void {
        const { displayType, color, url } = geometry;
        // this.logger.debug(`Geo for id ${id} set to '${url}'`);
        const isMesh = displayType === GeometryDisplayType.OBJ;
        const isPDB = displayType === GeometryDisplayType.PDB;
        console.log(color); // TODO: handle color
        if (!url) {
            // displayType not either pdb or obj, will show a sphere
            // TODO: handle CUBE, GIZMO etc
            return;
        }
        const urlOrPath = checkAndSanitizePath(url);

        if (isMesh || isPDB) {
            this.attemptToLoadGeometry(urlOrPath, displayType);
        }
    }
}

export default GeometryStore;
