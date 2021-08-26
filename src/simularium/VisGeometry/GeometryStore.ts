import { forEach } from "lodash";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

import { BufferGeometry, Object3D, Mesh } from "three";
import { checkAndSanitizePath } from "../../util";
import PDBModel from "../PDBModel";
import { InstancedMesh } from "../rendering/InstancedMesh";
import VisAgent from "../VisAgent";
import { REASON_CANCELLED } from "../worker/TaskQueue";
import { MeshLoadRequest } from "./types";

const DEFAULT_MESH_NAME = "SPHERE";

type Registry = Map<string | number, MeshLoadRequest | PDBModel>;

class GeometryStore {
    // maps mesh name to mesh data
    public meshRegistry: Map<string | number, MeshLoadRequest>;
    // maps pdb name to pdb data
    public pdbRegistry: Map<string | number, PDBModel>;
    // stores locally loaded pdb data
    public cachedPdbRegistry: Map<string | number, PDBModel>;
    public cachedMeshRegistry: Map<string | number, MeshLoadRequest>;
    public geoLoadAttempted: Map<string, boolean>;
    private _cachedAssets: Map<string, string>;
    private _registry: Registry;

    constructor() {
        this.meshRegistry = new Map<string | number, MeshLoadRequest>();
        this.cachedMeshRegistry = new Map<string | number, MeshLoadRequest>();
        this.pdbRegistry = new Map<string | number, PDBModel>();
        this.cachedPdbRegistry = new Map<string | number, PDBModel>();
        this.geoLoadAttempted = new Map<string, boolean>();
        this._cachedAssets = new Map<string, string>();
        this._registry = new Map<string | number, MeshLoadRequest | PDBModel>();
    }

    public init() {
        this.registry.clear();
        this.registry.set(DEFAULT_MESH_NAME, {
            mesh: new Mesh(VisAgent.sphereGeometry),
            cancelled: false,
            instances: new InstancedMesh(
                VisAgent.sphereGeometry,
                DEFAULT_MESH_NAME,
                1
            ),
        });
    }

    public get registry(): Registry {
        return this._registry;
    }

    private handleNewPdb(pdbEntry) {}

    private loadPdb(url: string): void {
        const pdbmodel = new PDBModel(url);
        this.pdbRegistry.set(url, pdbmodel);
        pdbmodel.download(url).then(
            () => {
                const pdbEntry = this.pdbRegistry.get(url);
                if (
                    pdbEntry &&
                    pdbEntry === pdbmodel &&
                    !pdbEntry.isCancelled()
                ) {
                    this.logger.debug("Finished loading pdb: ", url);
                    this.onNewPdb(url);
                    // initiate async LOD processing
                    pdbmodel.generateLOD().then(() => {
                        this.logger.debug("Finished loading pdb LODs: ", url);
                        this.onNewPdb(url);
                    });
                }
            },
            (reason) => {
                this.pdbRegistry.delete(url);
                if (reason !== REASON_CANCELLED) {
                    this.logger.debug("Failed to load pdb: ", url);

                    this.onError(
                        `Failed to fetch PDB file:
                            ${url}.
                            Showing spheres for this geometry instead`
                    );
                }
            }
        );
    }

    private prepMeshRegistryForNewObj(meshName: string): void {
        if (this._registry.has(meshName)) {
            const entry = this.meshRegistry.get(meshName);
            if (entry) {
                // there is already a mesh registered but we are going to load a new one.
                // start by resetting this entry to a sphere. we will replace when the new mesh arrives
                entry.mesh = new Mesh(VisAgent.sphereGeometry);
                entry.instances.replaceGeometry(
                    VisAgent.sphereGeometry,
                    meshName
                );
            } else {
                console.error(
                    "unreachable, meshRegistry entry assumed to exist"
                );
            }
        } else {
            // if this mesh is not yet registered, then start off as a sphere
            // we will replace the sphere in here with the real geometry when it arrives.
            this._registry.set(meshName, {
                mesh: new Mesh(VisAgent.sphereGeometry),
                cancelled: false,
                instances: new InstancedMesh(
                    VisAgent.sphereGeometry,
                    meshName,
                    1
                ),
            });
        }
    }

    public cacheLocalAssets(assets: { [key: string]: string }): void {
        forEach(assets, (value, key) => {
            const path = checkAndSanitizePath(key);
            this._cachedAssets.set(path, value);
        });
    }

    private handleObjResponse(meshName: string, object: Object3D): void {
        const meshLoadRequest = this._registry.get(meshName);
        if (
            (meshLoadRequest && meshLoadRequest.cancelled) ||
            !meshLoadRequest
        ) {
            this._registry.delete(meshName);
            return;
        }

        this.logger.debug("Finished loading mesh: ", meshName);
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

    public loadObj(url: string): void {
        const objLoader = new OBJLoader();
        this.prepMeshRegistryForNewObj(this.meshRegistry, url);
        return objLoader.load(
            url,
            (object) => {
                this.handleObjResponse(this.meshRegistry, url, object);
            },
            (xhr) => {
                this.logger.debug(
                    url,
                    " ",
                    `${(xhr.loaded / xhr.total) * 100}% loaded`
                );
            },
            (error) => {
                // if the request fails, leave agent as a sphere by default
                this.logger.debug("Failed to load mesh: ", error, url);
                this.onError(
                    `Failed to load mesh: ${url}. Showing spheres for this geometry instead.`
                );
            }
        );
    }
    private attemptToLoadGeometry(url: string, loadFunctionName: string) {
        if (!this._registry.has(url) && !this.geoLoadAttempted.get(url)) {
            this.geoLoadAttempted.set(url, true);
            return this[loadFunctionName](url);
        }
    }
    /**
     * Then meshName --> actual mesh, via meshRegistry (or pdbRegistry)
     */
    public mapIdToGeom(
        id: number,
        displayType: string,
        onLoaded,
        url?: string,
        color?: string
    ): void {
        this.logger.debug(`Geo for id ${id} set to '${url}'`);
        const unassignedName = `${VisAgent.UNASSIGNED_NAME_PREFIX}-${id}`;
        const isMesh = displayType === "OBJ";
        const isPDB = displayType === "PDB";
        console.log(color); // TODO: handle color
        if (!url) {
            // displayType not either pdb or obj, will show a sphere
            // TODO: handle CUBE, GIZMO etc
            return;
        }
        const urlOrPath = checkAndSanitizePath(url);
        if (this._cachedAssets.has(urlOrPath)) {
            if (isMesh) {
                this.handleObjResponse(
                    urlOrPath,
                    this._cachedAssets.get(urlOrPath)
                );
                onLoaded("OBJ", urlOrPath, this._registry.get(urlOrPath));
            } else if (isPDB) {
                const pdbModel = new PDBModel(urlOrPath);
                this._registry.set(urlOrPath, pdbModel);
                onLoaded("PDB", urlOrPath, pdbModel);
                pdbModel.parsePDBData(urlOrPath);
                // initiate async LOD processing
                pdbModel.generateLOD().then(() => {
                    this.logger.debug("Finished loading pdb LODs: ", urlOrPath);
                    onLoaded("PDB", urlOrPath, pdbModel);
                });
            }
            this.geoLoadAttempted.set(urlOrPath, true);
            this._cachedAssets.delete(urlOrPath);
        } else {
            if (isMesh) {
                this.attemptToLoadGeometry(url, "loadObj");
            } else if (isPDB) {
                this.attemptToLoadGeometry(url, "loadPdb");
            } else if (!this._registry.has(unassignedName)) {
                // assign single atom pdb
                const pdbmodel = new PDBModel(unassignedName);
                pdbmodel.create(1);
                this._registry.set(unassignedName, pdbmodel);
            }
        }
    }
}

export default GeometryStore;
