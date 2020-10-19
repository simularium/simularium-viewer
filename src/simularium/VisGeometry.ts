import { WEBGL } from "three/examples/jsm/WebGL.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import VisAgent from "./VisAgent";
import VisTypes from "./VisTypes";
import PDBModel from "./PDBModel";
import TaskQueue from "./worker/TaskQueue";
import { REASON_CANCELLED } from "./worker/TaskQueue";

import {
    Box3,
    Box3Helper,
    BufferAttribute,
    BufferGeometry,
    Color,
    DirectionalLight,
    Group,
    HemisphereLight,
    LineBasicMaterial,
    LineSegments,
    Object3D,
    PerspectiveCamera,
    Raycaster,
    Scene,
    Vector2,
    Vector3,
    VertexColors,
    WebGLRenderer,
    WebGLRendererParameters,
    Mesh,
    Quaternion,
} from "three";

import * as dat from "dat.gui";

import jsLogger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";

import { TrajectoryFileInfo } from "./types";
import { AgentData } from "./VisData";

import MoleculeRenderer from "./rendering/MoleculeRenderer";

const MAX_PATH_LEN = 32;
const MAX_MESHES = 100000;
const DEFAULT_BACKGROUND_COLOR = new Color(0, 0, 0);
const DEFAULT_VOLUME_BOUNDS = [-150, -150, -150, 150, 150, 150];
const BOUNDING_BOX_COLOR = new Color(0x6e6e6e);
const NO_AGENT = -1;
const DEFAULT_CAMERA_Z_POSITION = 120;
export enum RenderStyle {
    GENERIC,
    MOLECULAR,
}

function lerp(x0: number, x1: number, alpha: number): number {
    return x0 + (x1 - x0) * alpha;
}

interface AgentTypeGeometry {
    meshName: string;
    pdbName: string;
}

interface MeshLoadRequest {
    mesh: Object3D;
    cancelled: boolean;
}

interface HSL {
    h: number;
    s: number;
    l: number;
}

interface PathData {
    agent: number;
    numSegments: number;
    maxSegments: number;
    color: Color;
    points: Float32Array;
    colors: Float32Array;
    geometry: BufferGeometry;
    material: LineBasicMaterial;
    line: LineSegments;
}

// per agent type Visdata format
interface AgentTypeVisData {
    mesh?: string;
    scale: number;
    pdb?: string;
}

type AgentTypeVisDataMap = Map<string, AgentTypeVisData>;

class VisGeometry {
    public renderStyle: RenderStyle;
    public backgroundColor: Color;
    public pathEndColor: Color;
    public visGeomMap: Map<number, AgentTypeGeometry>;
    public meshRegistry: Map<string | number, MeshLoadRequest>;
    public pdbRegistry: Map<string | number, PDBModel>;
    public meshLoadAttempted: Map<string, boolean>;
    public pdbLoadAttempted: Map<string, boolean>;
    public scaleMapping: Map<number, number>;
    public geomCount: number;
    public followObjectId: number;
    public visAgents: VisAgent[];
    public visAgentInstances: Map<number, VisAgent>;
    public lastNumberOfAgents: number;
    public fixLightsToCamera: boolean;
    public highlightedIds: number[];
    public hiddenIds: number[];
    public paths: PathData[];
    public mlogger: ILogger;
    public renderer: WebGLRenderer;
    public scene: Scene;
    public camera: PerspectiveCamera;
    public controls: OrbitControls;
    public dl: DirectionalLight;
    public boundingBox: Box3;
    public boundingBoxMesh: Box3Helper;
    // front and back of transformed bounds in camera space
    private boxNearZ: number;
    private boxFarZ: number;

    public hemiLight: HemisphereLight;
    public moleculeRenderer: MoleculeRenderer;
    public atomSpread = 3.0;
    public numAtomsPerAgent = 8;
    public currentSceneAgents: AgentData[];
    public colorsData: Float32Array;
    public lightsGroup: Group;
    public agentMeshGroup: Group;
    public agentFiberGroup: Group;
    public agentPDBGroup: Group;
    public agentPathGroup: Group;
    public idColorMapping: Map<number, number>;
    private raycaster: Raycaster;
    private supportsMoleculeRendering: boolean;
    private membraneAgent?: VisAgent;
    private resetCameraOnNewScene: boolean;
    private lodBias: number;
    private lodDistanceStops: number[];
    private needToCenterCamera: boolean;
    private needToReOrientCamera: boolean;
    private rotateDistance: number;
    private initCameraPosition: Vector3;

    public constructor(loggerLevel: ILogLevel) {
        this.renderStyle = RenderStyle.MOLECULAR;
        this.supportsMoleculeRendering = false;
        // TODO: pass this flag in from the outside
        this.resetCameraOnNewScene = true;

        this.visGeomMap = new Map<number, AgentTypeGeometry>();
        this.meshRegistry = new Map<string | number, MeshLoadRequest>();
        this.pdbRegistry = new Map<string | number, PDBModel>();
        this.meshLoadAttempted = new Map<string, boolean>();
        this.pdbLoadAttempted = new Map<string, boolean>();
        this.scaleMapping = new Map<number, number>();
        this.idColorMapping = new Map<number, number>();
        this.geomCount = MAX_MESHES;
        this.followObjectId = NO_AGENT;
        this.visAgents = [];
        this.visAgentInstances = new Map<number, VisAgent>();
        this.lastNumberOfAgents = 0;
        this.fixLightsToCamera = true;
        this.highlightedIds = [];
        this.hiddenIds = [];
        this.needToCenterCamera = false;
        this.needToReOrientCamera = false;
        this.rotateDistance = DEFAULT_CAMERA_Z_POSITION;
        // will store data for all agents that are drawing paths
        this.paths = [];

        this.setupScene();

        this.membraneAgent = undefined;

        this.moleculeRenderer = new MoleculeRenderer();

        this.backgroundColor = DEFAULT_BACKGROUND_COLOR;
        this.pathEndColor = this.backgroundColor.clone();
        this.moleculeRenderer.setBackgroundColor(this.backgroundColor);

        this.mlogger = jsLogger.get("visgeometry");
        this.mlogger.setLevel(loggerLevel);

        this.scene = new Scene();
        this.lightsGroup = new Group();
        this.agentMeshGroup = new Group();
        this.agentFiberGroup = new Group();
        this.agentPDBGroup = new Group();
        this.agentPathGroup = new Group();

        this.camera = new PerspectiveCamera(75, 100 / 100, 0.1, 10000);

        this.initCameraPosition = this.camera.position.clone();

        this.dl = new DirectionalLight(0xffffff, 0.6);
        this.hemiLight = new HemisphereLight(0xffffff, 0x000000, 0.5);
        this.renderer = new WebGLRenderer();
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );

        this.boundingBox = new Box3(
            new Vector3(0, 0, 0),
            new Vector3(100, 100, 100)
        );
        this.boundingBoxMesh = new Box3Helper(
            this.boundingBox,
            BOUNDING_BOX_COLOR
        );
        this.boxNearZ = 0;
        this.boxFarZ = 100;
        this.currentSceneAgents = [];
        this.colorsData = new Float32Array(0);
        this.lodBias = 0;
        this.lodDistanceStops = [40, 100, 150, Number.MAX_VALUE];
        if (loggerLevel === jsLogger.DEBUG) {
            this.setupGui();
        }
        this.raycaster = new Raycaster();
    }

    public setBackgroundColor(
        c: string | number | [number, number, number] | undefined
    ): void {
        if (c === undefined) {
            this.backgroundColor = DEFAULT_BACKGROUND_COLOR.clone();
        } else {
            // convert from a PropColor to a THREE.Color
            this.backgroundColor = Array.isArray(c)
                ? new Color(c[0], c[1], c[2])
                : new Color(c);
        }
        this.pathEndColor = this.backgroundColor.clone();
        this.moleculeRenderer.setBackgroundColor(this.backgroundColor);
        this.renderer.setClearColor(this.backgroundColor, 1);
    }

    public setupGui(): void {
        const gui = new dat.GUI();
        const settings = {
            lodBias: this.lodBias,
            atomSpread: this.atomSpread,
            numAtoms: this.numAtomsPerAgent,
            bgcolor: {
                r: this.backgroundColor.r * 255,
                g: this.backgroundColor.g * 255,
                b: this.backgroundColor.b * 255,
            },
        };
        gui.add(settings, "lodBias", 0, 4)
            .step(1)
            .onChange((value) => {
                this.lodBias = value;
                this.updateScene(this.currentSceneAgents);
            });
        gui.addColor(settings, "bgcolor").onChange((value) => {
            this.setBackgroundColor([
                value.r / 255.0,
                value.g / 255.0,
                value.b / 255.0,
            ]);
        });
        gui.add(settings, "atomSpread", 0.01, 8.0).onChange((value) => {
            this.atomSpread = value;
            this.updateScene(this.currentSceneAgents);
        });
        gui.add(settings, "numAtoms", 1, 400)
            .step(1)
            .onChange((value) => {
                this.numAtomsPerAgent = Math.floor(value);
                this.updateScene(this.currentSceneAgents);
            });

        this.moleculeRenderer.setupGui(gui);
    }

    public setRenderStyle(renderStyle: RenderStyle): void {
        // if target render style is supported, then change, otherwise don't.
        if (
            renderStyle === RenderStyle.MOLECULAR &&
            !this.supportsMoleculeRendering
        ) {
            console.log("Warning: molecule rendering not supported");
            return;
        }

        this.renderStyle = renderStyle;
        this.updateScene(this.currentSceneAgents);
    }

    public get logger(): ILogger {
        return this.mlogger;
    }

    public get renderDom(): HTMLElement {
        return this.renderer.domElement;
    }

    public handleTrajectoryData(trajectoryData: TrajectoryFileInfo): void {
        // get bounds.
        if (trajectoryData.hasOwnProperty("size")) {
            const bx = trajectoryData.size.x;
            const by = trajectoryData.size.y;
            const bz = trajectoryData.size.z;
            const epsilon = 0.000001;
            if (
                Math.abs(bx) < epsilon ||
                Math.abs(by) < epsilon ||
                Math.abs(bz) < epsilon
            ) {
                console.log(
                    "WARNING: Bounding box: at least one bound is zero; using default bounds"
                );
                this.resetBounds(DEFAULT_VOLUME_BOUNDS);
            } else {
                this.resetBounds([
                    -bx / 2,
                    -by / 2,
                    -bz / 2,
                    bx / 2,
                    by / 2,
                    bz / 2,
                ]);
            }
        } else {
            this.resetBounds(DEFAULT_VOLUME_BOUNDS);
        }
        if (this.resetCameraOnNewScene) {
            this.resetCamera();
        }
    }

    public resetCamera(): void {
        this.followObjectId = NO_AGENT;
        this.controls.reset();
    }

    public centerCamera(): void {
        this.followObjectId = NO_AGENT;
        this.needToCenterCamera = true;
    }

    public reOrientCamera(): void {
        this.followObjectId = NO_AGENT;
        this.needToReOrientCamera = true;
        this.rotateDistance = this.camera.position.distanceTo(new Vector3());
    }

    public getFollowObject(): number {
        return this.followObjectId;
    }

    public setFollowObject(obj: number): void {
        if (this.membraneAgent && obj === this.membraneAgent.id) {
            return;
        }

        if (this.followObjectId !== NO_AGENT) {
            const visAgent = this.visAgentInstances.get(this.followObjectId);
            if (!visAgent) {
                console.error("NO AGENT FOR INSTANCE " + this.followObjectId);
            } else {
                visAgent.setFollowed(false);
            }
        }
        this.followObjectId = obj;

        if (obj !== NO_AGENT) {
            const visAgent = this.visAgentInstances.get(obj);
            if (!visAgent) {
                console.error("NO AGENT FOR INSTANCE " + this.followObjectId);
            } else {
                visAgent.setFollowed(true);
            }
        }
    }

    public unfollow(): void {
        this.setFollowObject(NO_AGENT);
    }

    public setVisibleByIds(hiddenIds: number[]): void {
        this.hiddenIds = hiddenIds;

        // go over all objects and update material
        const nMeshes = this.visAgents.length;
        for (let i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
            const visAgent = this.visAgents[i];
            if (visAgent.active) {
                const isHidden = this.hiddenIds.includes(visAgent.typeId);
                visAgent.setHidden(isHidden);
            }
        }
        this.updateScene(this.currentSceneAgents);
    }

    public setHighlightByIds(ids: number[]): void {
        this.highlightedIds = ids;

        // go over all objects and update material
        const nMeshes = this.visAgents.length;
        for (let i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
            const visAgent = this.visAgents[i];
            if (visAgent.active) {
                const isHighlighted = this.highlightedIds.includes(
                    visAgent.typeId
                );
                visAgent.setHighlighted(isHighlighted);
            }
        }
    }

    public dehighlight(): void {
        this.setHighlightByIds([]);
    }

    public onNewRuntimeGeometryType(meshName: string): void {
        // find all typeIds for this meshName
        const typeIds = [...this.visGeomMap.entries()]
            .filter(({ 1: v }) => v.meshName === meshName)
            .map(([k]) => k);

        // assuming the meshLoadRequest has already been added to the registry
        const meshLoadRequest = this.meshRegistry.get(meshName);
        if (meshLoadRequest === undefined) {
            console.error(`Mesh name ${meshName} not found in mesh registry`);
            return;
        }

        // go over all objects and update mesh of this typeId
        // if this happens before the first updateScene, then the visAgents don't have type id's yet.
        const nMeshes = this.visAgents.length;
        for (let i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
            const visAgent = this.visAgents[i];
            if (typeIds.includes(visAgent.typeId)) {
                this.resetAgentGeometry(visAgent, meshLoadRequest.mesh);
                visAgent.setColor(
                    this.getColorForTypeId(visAgent.typeId),
                    this.getColorIndexForTypeId(visAgent.typeId)
                );
            }
        }

        this.updateScene(this.currentSceneAgents);
    }

    private resetAgentGeometry(visAgent: VisAgent, meshGeom: Object3D): void {
        this.agentMeshGroup.remove(visAgent.mesh);
        this.agentFiberGroup.remove(visAgent.mesh);
        visAgent.setupMeshGeometry(meshGeom);
        if (visAgent.visType === VisTypes.ID_VIS_TYPE_DEFAULT) {
            this.agentMeshGroup.add(visAgent.mesh);
        } else if (visAgent.visType === VisTypes.ID_VIS_TYPE_FIBER) {
            this.agentFiberGroup.add(visAgent.mesh);
        }
    }

    public onNewPdb(pdbName: string): void {
        // find all typeIds for this meshName
        const typeIds = [...this.visGeomMap.entries()]
            .filter(({ 1: v }) => v.pdbName === pdbName)
            .map(([k]) => k);

        // assuming the pdb has already been added to the registry
        const pdb = this.pdbRegistry.get(pdbName);

        // go over all objects and update mesh of this typeId
        // if this happens before the first updateScene, then the visAgents don't have type id's yet.
        const nMeshes = this.visAgents.length;
        for (let i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
            const visAgent = this.visAgents[i];
            if (typeIds.includes(visAgent.typeId)) {
                this.resetAgentPDB(visAgent, pdb);
                visAgent.setColor(
                    this.getColorForTypeId(visAgent.typeId),
                    this.getColorIndexForTypeId(visAgent.typeId)
                );
            }
        }

        this.updateScene(this.currentSceneAgents);
    }

    private resetAgentPDB(visAgent, pdb): void {
        for (let lod = 0; lod < visAgent.pdbObjects.length; ++lod) {
            this.agentPDBGroup.remove(visAgent.pdbObjects[lod]);
        }
        visAgent.setupPdb(pdb);
        for (let lod = 0; lod < visAgent.pdbObjects.length; ++lod) {
            this.agentPDBGroup.add(visAgent.pdbObjects[lod]);
        }
    }

    public setUpControls(element: HTMLElement): void {
        this.controls = new OrbitControls(this.camera, element);
        this.controls.maxDistance = 750;
        this.controls.minDistance = 5;
        this.controls.zoomSpeed = 1.0;
        this.controls.enablePan = false;
        this.controls.saveState();
    }

    /**
     *   Setup ThreeJS Scene
     * */
    public setupScene(): void {
        const initWidth = 100;
        const initHeight = 100;
        this.scene = new Scene();
        this.lightsGroup = new Group();
        this.lightsGroup.name = "lights";
        this.scene.add(this.lightsGroup);
        this.agentMeshGroup = new Group();
        this.agentMeshGroup.name = "agent meshes";
        this.scene.add(this.agentMeshGroup);
        this.agentFiberGroup = new Group();
        this.agentFiberGroup.name = "agent fibers";
        this.scene.add(this.agentFiberGroup);
        this.agentPDBGroup = new Group();
        this.agentPDBGroup.name = "agent pdbs";
        this.scene.add(this.agentPDBGroup);
        this.agentPathGroup = new Group();
        this.agentPathGroup.name = "agent paths";
        this.scene.add(this.agentPathGroup);

        this.camera = new PerspectiveCamera(
            75,
            initWidth / initHeight,
            0.1,
            1000
        );

        this.resetBounds(DEFAULT_VOLUME_BOUNDS);

        this.dl = new DirectionalLight(0xffffff, 0.6);
        this.dl.position.set(0, 0, 1);
        this.lightsGroup.add(this.dl);

        this.hemiLight = new HemisphereLight(0xffffff, 0x000000, 0.5);
        this.hemiLight.color.setHSL(0.095, 1, 0.75);
        this.hemiLight.groundColor.setHSL(0.6, 1, 0.6);
        this.hemiLight.position.set(0, 1, 0);
        this.lightsGroup.add(this.hemiLight);

        if (WEBGL.isWebGL2Available() === false) {
            this.renderStyle == RenderStyle.GENERIC;
            this.renderer = new WebGLRenderer();
        } else {
            // TODO: consider switching to molecule rendering by default here??

            this.supportsMoleculeRendering = true;
            const canvas = document.createElement("canvas");
            const context: WebGLRenderingContext = canvas.getContext("webgl2", {
                alpha: false,
            }) as WebGLRenderingContext;

            const rendererParams: WebGLRendererParameters = {
                canvas: canvas,
                context: context,
            };
            this.renderer = new WebGLRenderer(rendererParams);
        }

        this.renderer.setSize(initWidth, initHeight); // expected to change when reparented
        this.renderer.setClearColor(this.backgroundColor, 1);
        this.renderer.clear();

        this.camera.position.z = DEFAULT_CAMERA_Z_POSITION;
        this.initCameraPosition = this.camera.position.clone();
    }

    public loadPdb(pdbName: string, assetPath: string): void {
        const pdbmodel = new PDBModel(pdbName);
        this.pdbRegistry.set(pdbName, pdbmodel);
        pdbmodel.download(`${assetPath}/${pdbName}`).then(
            () => {
                const pdbEntry = this.pdbRegistry.get(pdbName);
                if (
                    pdbEntry &&
                    pdbEntry === pdbmodel &&
                    !pdbEntry.isCancelled()
                ) {
                    this.logger.debug("Finished loading pdb: ", pdbName);
                    this.onNewPdb(pdbName);
                    // initiate async LOD processing
                    pdbmodel.generateLOD().then(() => {
                        this.logger.debug(
                            "Finished loading pdb LODs: ",
                            pdbName
                        );
                        this.onNewPdb(pdbName);
                    });
                }
            },
            (reason) => {
                this.pdbRegistry.delete(pdbName);
                if (reason !== REASON_CANCELLED) {
                    console.error(reason);
                    this.logger.debug("Failed to load pdb: ", pdbName);
                }
            }
        );
    }

    public loadObj(meshName: string, assetPath: string): void {
        const objLoader = new OBJLoader();
        this.meshRegistry.set(meshName, {
            mesh: new Mesh(VisAgent.sphereGeometry),
            cancelled: false,
        });
        objLoader.load(
            `${assetPath}/${meshName}`,
            (object) => {
                const meshLoadRequest = this.meshRegistry.get(meshName);
                if (
                    (meshLoadRequest && meshLoadRequest.cancelled) ||
                    !meshLoadRequest
                ) {
                    this.meshRegistry.delete(meshName);
                    return;
                }

                this.logger.debug("Finished loading mesh: ", meshName);
                // insert new mesh into meshRegistry
                this.meshRegistry.set(meshName, {
                    mesh: object,
                    cancelled: false,
                });
                if (!object.name) {
                    object.name = meshName;
                }
                this.onNewRuntimeGeometryType(meshName);
            },
            (xhr) => {
                this.logger.debug(
                    meshName,
                    " ",
                    `${(xhr.loaded / xhr.total) * 100}% loaded`
                );
            },
            (error) => {
                this.meshRegistry.delete(meshName);
                console.error(error);
                this.logger.debug("Failed to load mesh: ", error, meshName);
            }
        );
    }

    public resize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.moleculeRenderer.resize(width, height);
    }

    public reparent(parent?: HTMLElement | null): void {
        if (parent === undefined || parent == null) {
            return;
        }

        const height = parent.scrollHeight;
        const width = parent.scrollWidth;
        parent.appendChild(this.renderer.domElement);
        this.setUpControls(this.renderer.domElement);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        this.moleculeRenderer.resize(width, height);

        this.renderer.setClearColor(this.backgroundColor, 1.0);
        this.renderer.clear();

        this.renderer.domElement.setAttribute("style", "top: 0px; left: 0px");

        this.renderer.domElement.onmouseenter = () => this.enableControls();
        this.renderer.domElement.onmouseleave = () => this.disableControls();
    }

    public disableControls(): void {
        this.controls.enabled = false;
    }

    public enableControls(): void {
        this.controls.enabled = true;
    }

    public render(time: number): void {
        if (this.visAgents.length === 0) {
            return;
        }

        const elapsedSeconds = time / 1000;

        if (this.membraneAgent) {
            VisAgent.updateMembrane(elapsedSeconds, this.renderer);
        }

        this.controls.update();

        this.animateCamera();

        this.camera.updateMatrixWorld();
        this.transformBoundingBox();

        // update light sources due to camera moves
        if (this.dl && this.fixLightsToCamera) {
            // position directional light at camera (facing scene, as headlight!)
            this.dl.position.setFromMatrixColumn(this.camera.matrixWorld, 2);
        }
        if (this.hemiLight && this.fixLightsToCamera) {
            // make hemi light come down from vertical of screen (camera up)
            this.hemiLight.position.setFromMatrixColumn(
                this.camera.matrixWorld,
                1
            );
        }

        if (this.renderStyle == RenderStyle.GENERIC) {
            // meshes only.
            this.renderer.render(this.scene, this.camera);
        } else {
            // select visibility and representation.
            // and set lod for pdbs.
            for (let i = 0; i < this.visAgents.length; ++i) {
                const agent = this.visAgents[i];
                if (agent.active) {
                    if (agent.hidden) {
                        agent.hide();
                    } else if (agent.hasDrawablePDB()) {
                        const agentDistance = this.camera.position.distanceTo(
                            agent.mesh.position
                        );
                        agent.renderAsPDB(
                            agentDistance,
                            this.lodDistanceStops,
                            this.lodBias
                        );
                    } else {
                        agent.renderAsMesh();
                    }
                }
            }

            this.scene.updateMatrixWorld();
            this.scene.autoUpdate = false;
            this.moleculeRenderer.setMeshGroups(
                this.agentMeshGroup,
                this.agentPDBGroup,
                this.agentFiberGroup
            );
            this.moleculeRenderer.setFollowedInstance(this.followObjectId);
            this.moleculeRenderer.setNearFar(this.boxNearZ, this.boxFarZ);
            this.boundingBoxMesh.visible = false;
            this.agentPathGroup.visible = false;
            this.moleculeRenderer.render(
                this.renderer,
                this.scene,
                this.camera,
                null
            );

            // final pass, add extra stuff on top: bounding box and line paths
            this.boundingBoxMesh.visible = true;
            this.agentPathGroup.visible = true;

            this.renderer.autoClear = false;
            // hide everything except the wireframe and paths, and render with the standard renderer
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = false;
            this.renderer.render(this.scene, this.camera);
            this.agentMeshGroup.visible = true;
            this.agentFiberGroup.visible = true;
            this.agentPDBGroup.visible = true;
            this.renderer.autoClear = true;

            this.scene.autoUpdate = true;
        }
    }

    private transformBoundingBox() {
        // bounds are in world space
        const box = new Box3().copy(this.boundingBox);
        // world to camera space
        box.applyMatrix4(this.camera.matrixWorldInverse);
        // camera is pointing along negative Z.  so invert for positive distances
        this.boxNearZ = -box.max.z;
        this.boxFarZ = -box.min.z;
        // compare with CompositePass float eyeDepth = -col0.z; to use a positive distance value.
    }

    public hitTest(offsetX: number, offsetY: number): number {
        const size = new Vector2();
        this.renderer.getSize(size);
        if (this.renderStyle === RenderStyle.GENERIC) {
            const mouse = {
                x: (offsetX / size.x) * 2 - 1,
                y: -(offsetY / size.y) * 2 + 1,
            };

            this.raycaster.setFromCamera(mouse, this.camera);
            // intersect the agent mesh group.
            let intersects = this.raycaster.intersectObjects(
                this.agentMeshGroup.children,
                true
            );
            // try fibers next
            if (!intersects.length) {
                intersects = this.raycaster.intersectObjects(
                    this.agentFiberGroup.children,
                    true
                );
            }

            if (intersects && intersects.length) {
                let obj = intersects[0].object;
                // if the object has a parent and the parent is not the scene, use that.
                // assumption: obj file meshes or fibers load into their own Groups
                // and have only one level of hierarchy.
                if (!obj.userData || !obj.userData.id) {
                    if (obj.parent && obj.parent !== this.agentMeshGroup) {
                        obj = obj.parent;
                    }
                }
                return obj.userData.id;
            } else {
                return NO_AGENT;
            }
        } else {
            // read from instance buffer pixel!
            return this.moleculeRenderer.hitTest(
                this.renderer,
                offsetX,
                size.y - offsetY
            );
        }
    }

    /**
     *   Run Time Mesh functions
     */
    public createMaterials(colors: (number | string)[]): void {
        // convert any #FFFFFF -> 0xFFFFFF
        const colorNumbers = colors.map((color) =>
            parseInt(color.toString().replace(/^#/, "0x"), 16)
        );

        const numColors = colors.length;
        // fill buffer of colors:
        this.colorsData = new Float32Array(numColors * 4);
        for (let i = 0; i < numColors; i += 1) {
            // each color is currently a hex value:
            this.colorsData[i * 4 + 0] =
                ((colorNumbers[i] & 0x00ff0000) >> 16) / 255.0;
            this.colorsData[i * 4 + 1] =
                ((colorNumbers[i] & 0x0000ff00) >> 8) / 255.0;
            this.colorsData[i * 4 + 2] =
                ((colorNumbers[i] & 0x000000ff) >> 0) / 255.0;
            this.colorsData[i * 4 + 3] = 1.0;
        }
        this.moleculeRenderer.updateColors(numColors, this.colorsData);

        this.visAgents.forEach((agent) => {
            agent.setColor(
                this.getColorForTypeId(agent.typeId),
                this.getColorIndexForTypeId(agent.typeId)
            );
        });
    }

    private getColorIndexForTypeId(typeId: number): number {
        const index = this.idColorMapping[typeId];
        return index % (this.colorsData.length / 4);
    }

    private getColorForTypeId(typeId: number): Color {
        const index = this.getColorIndexForTypeId(typeId);
        return this.getColorForIndex(index);
    }

    public setColorForIds(ids: number[], colorId: number): void {
        ids.forEach((id) => {
            this.idColorMapping[id] = colorId;
        });
    }

    public getColorForIndex(index: number): Color {
        return new Color(
            this.colorsData[index * 4],
            this.colorsData[index * 4 + 1],
            this.colorsData[index * 4 + 2]
        );
    }

    public createMeshes(): void {
        this.geomCount = MAX_MESHES;

        // multipass render:
        // draw moleculebuffer into several render targets to store depth, normals, colors
        // draw quad to composite the buffers into final frame

        // create placeholder agents
        for (let i = 0; i < this.geomCount; i += 1) {
            this.visAgents[i] = new VisAgent(`Agent_${i}`);
        }
    }

    /**
     *   Data Management
     */
    public resetMapping(): void {
        this.resetAllGeometry();

        this.visGeomMap.clear();
        this.meshRegistry.clear();
        this.pdbRegistry.clear();
        this.meshLoadAttempted.clear();
        this.pdbLoadAttempted.clear();
        this.scaleMapping.clear();
    }

    /**
     *   Map Type ID -> Geometry
     */
    public mapIdToGeom(
        id: number,
        meshName: string | undefined,
        pdbName: string | undefined,
        assetPath: string
    ): void {
        this.logger.debug("Mesh for id ", id, " set to ", meshName);
        this.logger.debug("PDB for id ", id, " set to ", pdbName);
        const unassignedName = `${VisAgent.UNASSIGNED_NAME_PREFIX}-${id}`;
        this.visGeomMap.set(id, {
            meshName: meshName || unassignedName,
            pdbName: pdbName || unassignedName,
        });
        if (
            meshName &&
            !this.meshRegistry.has(meshName) &&
            !this.meshLoadAttempted.get(meshName)
        ) {
            this.loadObj(meshName, assetPath);
            this.meshLoadAttempted.set(meshName, true);
        } else if (!this.meshRegistry.has(unassignedName)) {
            // assign mesh sphere
            this.meshRegistry.set(unassignedName, {
                mesh: new Mesh(VisAgent.sphereGeometry),
                cancelled: false,
            });
            this.onNewRuntimeGeometryType(unassignedName);
        }

        // try load pdb file also.
        if (
            pdbName &&
            !this.pdbRegistry.has(pdbName) &&
            !this.pdbLoadAttempted.get(pdbName)
        ) {
            this.loadPdb(pdbName, assetPath);
            this.pdbLoadAttempted.set(pdbName, true);
        } else if (!this.pdbRegistry.has(unassignedName)) {
            // assign single atom pdb
            const pdbmodel = new PDBModel(unassignedName);
            pdbmodel.create(1);
            this.pdbRegistry.set(unassignedName, pdbmodel);
        }
    }

    public getGeomFromId(id: number): Object3D | null {
        if (this.visGeomMap.has(id)) {
            const entry = this.visGeomMap.get(id);
            if (entry) {
                const meshName = entry.meshName;
                if (meshName && this.meshRegistry.has(meshName)) {
                    const meshLoadRequest = this.meshRegistry.get(meshName);
                    if (meshLoadRequest) {
                        return meshLoadRequest.mesh;
                    }
                }
            }
        }

        return null;
    }

    public getPdbFromId(id: number): PDBModel | null {
        if (this.visGeomMap.has(id)) {
            const entry = this.visGeomMap.get(id);
            if (entry) {
                const pdbName = entry.pdbName;
                if (pdbName && this.pdbRegistry.has(pdbName)) {
                    const pdb = this.pdbRegistry.get(pdbName);
                    if (pdb) {
                        return pdb;
                    }
                }
            }
        }

        return null;
    }

    public mapFromJSON(
        name: string,
        filePath: string,
        assetPath: string,
        callback?: (any) => void
    ): Promise<void | Response> {
        if (!filePath) {
            return Promise.resolve();
        }
        const jsonRequest = new Request(filePath);
        return fetch(jsonRequest)
            .then((response) => {
                if (!response.ok) {
                    return Promise.reject(response);
                }
                return response.json();
            })
            .catch((response: Response) => {
                if (response.status === 404) {
                    console.warn(
                        `Could not fetch geometry info for ${name} because ${filePath} does not exist.`
                    );
                } else {
                    console.error(
                        `Could not fetch geometry info for ${name}: ${response.statusText}`
                    );
                }
            })
            .then((data) => {
                if (data) {
                    this.setGeometryData(
                        data as AgentTypeVisDataMap,
                        assetPath,
                        callback
                    );
                }
            });
    }

    public setGeometryData(
        jsonData: AgentTypeVisDataMap,
        assetPath: string,
        callback?: (any) => void
    ): void {
        // clear things out in advance of loading all new geometry
        this.resetMapping();

        this.logger.debug("JSON Mesh mapping loaded: ", jsonData);

        Object.keys(jsonData).forEach((id) => {
            const entry: AgentTypeVisData = jsonData[id];
            if (id === "size") {
                console.log("WARNING: Ignoring deprecated bounding box data");
            } else {
                // mesh name is entry.mesh
                // pdb name is entry.pdb
                this.mapIdToGeom(Number(id), entry.mesh, entry.pdb, assetPath);
                this.setScaleForId(Number(id), entry.scale);
            }
        });
        if (callback) {
            callback(jsonData);
        }
    }

    public resetBounds(boundsAsArray?: number[]): void {
        if (!boundsAsArray) {
            console.log("invalid bounds received");
            return;
        }
        const visible = this.boundingBoxMesh
            ? this.boundingBoxMesh.visible
            : true;
        this.scene.remove(this.boundingBoxMesh);
        // array is minx,miny,minz, maxx,maxy,maxz
        this.boundingBox = new Box3(
            new Vector3(boundsAsArray[0], boundsAsArray[1], boundsAsArray[2]),
            new Vector3(boundsAsArray[3], boundsAsArray[4], boundsAsArray[5])
        );
        this.boundingBoxMesh = new Box3Helper(
            this.boundingBox,
            BOUNDING_BOX_COLOR
        );
        this.boundingBoxMesh.visible = visible;
        this.scene.add(this.boundingBoxMesh);

        if (this.controls) {
            this.controls.maxDistance =
                this.boundingBox.max.distanceTo(this.boundingBox.min) * 1.414;
        }
    }

    public setScaleForId(id: number, scale: number): void {
        this.logger.debug("Scale for id ", id, " set to ", scale);
        this.scaleMapping.set(id, scale);
    }

    public getScaleForId(id: number): number {
        if (this.scaleMapping.has(id)) {
            const scale = this.scaleMapping.get(id);
            if (scale) {
                return scale;
            }
        }

        return 1;
    }

    /**
     *   Update Scene
     * */
    public updateScene(agents: AgentData[]): void {
        this.currentSceneAgents = agents;

        let dx, dy, dz;

        agents.forEach((agentData, i) => {
            const visType = agentData["vis-type"];
            const instanceId = agentData.instanceId;
            const typeId = agentData.type;
            const scale = this.getScaleForId(typeId);
            const radius = agentData.cr ? agentData.cr : 1;

            const visAgent = this.visAgents[i];
            visAgent.id = instanceId;
            visAgent.mesh.userData = { id: instanceId };
            // note there may still be another agent later in the list with the same id, until it gets reset
            this.visAgentInstances.set(instanceId, visAgent);

            const lastTypeId = visAgent.typeId;

            visAgent.typeId = typeId;
            visAgent.active = true;
            if (visAgent.hidden) {
                visAgent.hide();
                return;
            }

            // if not fiber...
            if (visType === VisTypes.ID_VIS_TYPE_DEFAULT) {
                // did the agent type change since the last sim time?
                if (typeId !== lastTypeId || visType !== visAgent.visType) {
                    const meshGeom = this.getGeomFromId(typeId);
                    visAgent.visType = visType;
                    if (meshGeom) {
                        this.resetAgentGeometry(visAgent, meshGeom);
                        if (meshGeom.name.includes("membrane")) {
                            this.membraneAgent = visAgent;
                        }
                    }
                    const pdbGeom = this.getPdbFromId(typeId);
                    if (pdbGeom) {
                        this.resetAgentPDB(visAgent, pdbGeom);
                    }
                    if (!pdbGeom && !meshGeom) {
                        this.resetAgentGeometry(
                            visAgent,
                            new Mesh(VisAgent.sphereGeometry)
                        );
                    }
                    visAgent.setColor(
                        this.getColorForTypeId(typeId),
                        this.getColorIndexForTypeId(typeId)
                    );
                }

                const runtimeMesh = visAgent.mesh;

                dx = agentData.x - runtimeMesh.position.x;
                dy = agentData.y - runtimeMesh.position.y;
                dz = agentData.z - runtimeMesh.position.z;
                runtimeMesh.position.x = agentData.x;
                runtimeMesh.position.y = agentData.y;
                runtimeMesh.position.z = agentData.z;

                runtimeMesh.rotation.x = agentData.xrot;
                runtimeMesh.rotation.y = agentData.yrot;
                runtimeMesh.rotation.z = agentData.zrot;
                runtimeMesh.visible = true;

                runtimeMesh.scale.x = radius * scale;
                runtimeMesh.scale.y = radius * scale;
                runtimeMesh.scale.z = radius * scale;

                // update pdb transforms too
                const pdb = visAgent.pdbModel;
                if (pdb && pdb.pdb) {
                    for (let lod = 0; lod < visAgent.pdbObjects.length; ++lod) {
                        const obj = visAgent.pdbObjects[lod];
                        obj.position.x = agentData.x;
                        obj.position.y = agentData.y;
                        obj.position.z = agentData.z;

                        obj.rotation.x = agentData.xrot;
                        obj.rotation.y = agentData.yrot;
                        obj.rotation.z = agentData.zrot;

                        obj.scale.x = 1.0; //agentData.cr * scale;
                        obj.scale.y = 1.0; //agentData.cr * scale;
                        obj.scale.z = 1.0; //agentData.cr * scale;

                        obj.visible = false;
                    }
                }

                const path = this.findPathForAgent(instanceId);
                if (path && path.line) {
                    this.addPointToPath(
                        path,
                        agentData.x,
                        agentData.y,
                        agentData.z,
                        dx,
                        dy,
                        dz
                    );
                }
            } else if (visType === VisTypes.ID_VIS_TYPE_FIBER) {
                if (visAgent.mesh) {
                    visAgent.mesh.position.x = agentData.x;
                    visAgent.mesh.position.y = agentData.y;
                    visAgent.mesh.position.z = agentData.z;

                    visAgent.mesh.rotation.x = agentData.xrot;
                    visAgent.mesh.rotation.y = agentData.yrot;
                    visAgent.mesh.rotation.z = agentData.zrot;

                    visAgent.mesh.scale.x = 1.0;
                    visAgent.mesh.scale.y = 1.0;
                    visAgent.mesh.scale.z = 1.0;
                }

                // see if we need to initialize this agent as a fiber
                if (visType !== visAgent.visType) {
                    const meshGeom = VisAgent.makeFiber();
                    if (meshGeom) {
                        meshGeom.userData = { id: visAgent.id };
                        meshGeom.name = `Fiber_${instanceId}`;
                        visAgent.visType = visType;
                        this.resetAgentGeometry(visAgent, meshGeom);
                        visAgent.setColor(
                            this.getColorForTypeId(typeId),
                            this.getColorIndexForTypeId(typeId)
                        );
                    }
                }
                // did the agent type change since the last sim time?
                if (typeId !== lastTypeId) {
                    visAgent.mesh.userData = { id: visAgent.id };
                    // for fibers we currently only check the color
                    visAgent.setColor(
                        this.getColorForTypeId(typeId),
                        this.getColorIndexForTypeId(typeId)
                    );
                }

                visAgent.updateFiber(agentData.subpoints, agentData.cr, scale);

                visAgent.mesh.visible = true;
            }
        });

        this.hideUnusedAgents(agents.length);
    }

    public animateCamera(): void {
        const lerpTarget = true;
        const lerpPosition = true;
        const lerpRate = 0.2;
        const distanceBuffer = 0.002;
        const rotationBuffer = 0.01;
        if (this.followObjectId !== NO_AGENT) {
            // keep camera at same distance from target.
            const direction = new Vector3().subVectors(
                this.camera.position,
                this.controls.target
            );
            const distance = direction.length();
            direction.normalize();

            const followedObject = this.visAgentInstances.get(
                this.followObjectId
            );
            if (!followedObject) {
                return;
            }
            const newTarget = followedObject.getFollowPosition();

            // update controls target for orbiting
            if (lerpTarget) {
                this.controls.target.lerp(newTarget, lerpRate);
            } else {
                this.controls.target.copy(newTarget);
            }

            // update new camera position
            const newPosition = new Vector3();
            newPosition.subVectors(
                newTarget,
                direction.multiplyScalar(-distance)
            );
            if (lerpPosition) {
                this.camera.position.lerp(newPosition, lerpRate);
            } else {
                this.camera.position.copy(newPosition);
            }
        } else if (this.needToCenterCamera) {
            this.controls.target.lerp(new Vector3(), lerpRate);
            if (
                this.controls.target.distanceTo(new Vector3()) < distanceBuffer
            ) {
                this.controls.target.copy(new Vector3());
                this.needToCenterCamera = false;
            }
        } else if (this.needToReOrientCamera) {
            this.controls.target.copy(new Vector3());
            const { position } = this.camera;
            const curDistanceFromCenter = this.rotateDistance;
            const targetPosition = this.initCameraPosition
                .clone()
                .setLength(curDistanceFromCenter);
            const currentPosition = position.clone();

            const targetQuat = new Quaternion().setFromAxisAngle(
                targetPosition,
                0
            );
            const currentQuat = new Quaternion().copy(this.camera.quaternion);
            const totalAngle = currentQuat.angleTo(targetQuat);

            const newAngle = lerpRate * totalAngle; // gives same value as using quanternion.slerp
            const normal = currentPosition
                .clone()
                .cross(targetPosition)
                .normalize();

            this.camera.position.applyAxisAngle(normal, newAngle);
            this.camera.lookAt(new Vector3());

            // it doesnt seem to be able to get to zero, but this was small enough to look good
            if (this.camera.position.angleTo(targetPosition) < rotationBuffer) {
                this.needToReOrientCamera = false;
            }
        }
    }

    public findPathForAgent(id: number): PathData | null {
        const path = this.paths.find((path) => {
            return path.agent === id;
        });

        if (path) {
            return path;
        }
        return null;
    }

    // assumes color is a threejs color, or null/undefined
    public addPathForAgent(
        id: number,
        maxSegments?: number,
        color?: Color
    ): PathData {
        // make sure the idx is not already in our list.
        // could be optimized...
        const foundpath = this.findPathForAgent(id);
        if (foundpath) {
            if (foundpath.line) {
                foundpath.line.visible = true;
                return foundpath;
            }
        }

        if (!maxSegments) {
            maxSegments = MAX_PATH_LEN;
        }

        if (!color) {
            // get the agent's color. is there a simpler way?
            const agent = this.visAgentInstances.get(id);
            if (agent) {
                color = agent.color.clone();
            } else {
                console.error("COULD NOT FIND AGENT INSTANCE " + id);
            }
        }

        const pointsArray = new Float32Array(maxSegments * 3 * 2);
        const colorsArray = new Float32Array(maxSegments * 3 * 2);
        const lineGeometry = new BufferGeometry();
        lineGeometry.setAttribute(
            "position",
            new BufferAttribute(pointsArray, 3)
        );
        lineGeometry.setAttribute("color", new BufferAttribute(colorsArray, 3));
        // path starts empty: draw range spans nothing
        lineGeometry.setDrawRange(0, 0);

        // the line will be colored per-vertex
        const lineMaterial = new LineBasicMaterial({
            vertexColors: VertexColors,
        });

        const lineObject = new LineSegments(lineGeometry, lineMaterial);
        lineObject.frustumCulled = false;

        const pathdata: PathData = {
            agent: id,
            numSegments: 0,
            maxSegments: maxSegments,
            color: color || new Color(0xffffff),
            points: pointsArray,
            colors: colorsArray,
            geometry: lineGeometry,
            material: lineMaterial,
            line: lineObject,
        };

        this.agentPathGroup.add(pathdata.line);

        this.paths.push(pathdata);
        return pathdata;
    }

    public removePathForAgent(id: number): void {
        const pathindex = this.paths.findIndex((path) => {
            return path.agent === id;
        });
        if (pathindex === -1) {
            console.log(
                "attempted to remove path for agent " +
                    id +
                    " that doesn't exist."
            );
            return;
        }
        this.removeOnePath(pathindex);
    }

    private removeOnePath(pathindex) {
        const path = this.paths[pathindex];
        this.agentPathGroup.remove(path.line as Object3D);

        this.paths.splice(pathindex, 1);
    }

    private removeAllPaths() {
        while (this.paths.length > 0) {
            this.removeOnePath(0);
        }
    }

    public addPointToPath(
        path: PathData,
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number
    ): void {
        if (x === dx && y === dy && z === dz) {
            return;
        }
        // Check for periodic boundary condition:
        // if any agent moved more than half the volume size in one step,
        // assume it jumped the boundary going the other way.
        const volumeSize = new Vector3();
        this.boundingBox.getSize(volumeSize);
        if (
            Math.abs(dx) > volumeSize.x / 2 ||
            Math.abs(dy) > volumeSize.y / 2 ||
            Math.abs(dz) > volumeSize.z / 2
        ) {
            // now what?
            // TODO: clip line segment from x-dx to x against the bounds,
            // compute new line segments from x-dx to bound, and from x to opposite bound
            // For now, add a degenerate line segment
            dx = 0;
            dy = 0;
            dz = 0;
        }

        // check for paths at max length
        if (path.numSegments === path.maxSegments) {
            // because we append to the end, we can copyWithin to move points up to the beginning
            // as a means of removing the first point in the path.
            // shift the points:
            path.points.copyWithin(0, 3 * 2, path.maxSegments * 3 * 2);
            path.numSegments = path.maxSegments - 1;
        } else {
            // rewrite all the colors. this might be prohibitive for lots of long paths.
            for (let ic = 0; ic < path.numSegments + 1; ++ic) {
                // the very first point should be a=1
                const a = 1.0 - ic / (path.numSegments + 1);
                path.colors[ic * 6 + 0] = lerp(
                    path.color.r,
                    this.pathEndColor.r,
                    a
                );
                path.colors[ic * 6 + 1] = lerp(
                    path.color.g,
                    this.pathEndColor.g,
                    a
                );
                path.colors[ic * 6 + 2] = lerp(
                    path.color.b,
                    this.pathEndColor.b,
                    a
                );

                // the very last point should be b=0
                const b = 1.0 - (ic + 1) / (path.numSegments + 1);
                path.colors[ic * 6 + 3] = lerp(
                    path.color.r,
                    this.pathEndColor.r,
                    b
                );
                path.colors[ic * 6 + 4] = lerp(
                    path.color.g,
                    this.pathEndColor.g,
                    b
                );
                path.colors[ic * 6 + 5] = lerp(
                    path.color.b,
                    this.pathEndColor.b,
                    b
                );
            }
            ((path.line.geometry as BufferGeometry).attributes
                .color as BufferAttribute).needsUpdate = true;
        }
        // add a segment to this line
        path.points[path.numSegments * 2 * 3 + 0] = x - dx;
        path.points[path.numSegments * 2 * 3 + 1] = y - dy;
        path.points[path.numSegments * 2 * 3 + 2] = z - dz;
        path.points[path.numSegments * 2 * 3 + 3] = x;
        path.points[path.numSegments * 2 * 3 + 4] = y;
        path.points[path.numSegments * 2 * 3 + 5] = z;

        path.numSegments++;

        (path.line.geometry as BufferGeometry).setDrawRange(
            0,
            path.numSegments * 2
        );
        ((path.line.geometry as BufferGeometry).attributes
            .position as BufferAttribute).needsUpdate = true; // required after the first render
    }

    public setShowPaths(showPaths: boolean): void {
        for (let i = 0; i < this.paths.length; ++i) {
            const line = this.paths[i].line;
            if (line) {
                line.visible = showPaths;
            }
        }
    }

    public toggleAllAgentsHidden(hideAllAgents: boolean): void {
        const nMeshes = this.visAgents.length;
        for (let i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
            const visAgent = this.visAgents[i];

            if (visAgent.active) {
                visAgent.setHidden(hideAllAgents);
            }
        }
    }

    public setShowBounds(showBounds: boolean): void {
        this.boundingBoxMesh.visible = showBounds;
    }

    public showPathForAgent(id: number, visible: boolean): void {
        const path = this.findPathForAgent(id);
        if (path) {
            if (path.line) {
                path.line.visible = visible;
            }
        }
    }

    public hideUnusedAgents(numberOfAgents: number): void {
        const nMeshes = this.visAgents.length;
        for (let i = numberOfAgents; i < MAX_MESHES && i < nMeshes; i += 1) {
            const visAgent = this.visAgents[i];
            // hide the path if we're hiding the agent. should we remove the path here?
            this.showPathForAgent(visAgent.id, false);
            visAgent.hideAndDeactivate();
        }
    }

    public clear(): void {
        this.hideUnusedAgents(0);
    }

    public clearForNewTrajectory(): void {
        this.resetMapping();
        // remove current scene agents.
        this.visAgentInstances.clear();
        this.currentSceneAgents = [];
    }

    private cancelAllAsyncProcessing(): void {
        // note that this leaves cancelled things in the registries.
        // This should be called before the registries are cleared and probably
        // only makes sense to do if they are indeed about to be cleared.

        // don't process any queued requests
        TaskQueue.stopAll();
        // signal to cancel any pending pdbs
        this.pdbRegistry.forEach((value) => {
            value.setCancelled();
        });
        // signal to cancel any pending mesh downloads
        this.meshRegistry.forEach((value) => {
            value.cancelled = true;
        });
    }

    private resetAllGeometry(): void {
        this.cancelAllAsyncProcessing();

        this.unfollow();
        this.removeAllPaths();

        this.membraneAgent = undefined;

        // remove geometry from all visible scene groups.
        // Object3D.remove can be slow, and just doing it in-order here
        // is faster than doing it in the loop over all visAgents
        for (let i = this.agentMeshGroup.children.length - 1; i >= 0; i--) {
            this.agentMeshGroup.remove(this.agentMeshGroup.children[i]);
        }
        for (let i = this.agentFiberGroup.children.length - 1; i >= 0; i--) {
            this.agentFiberGroup.remove(this.agentFiberGroup.children[i]);
        }
        for (let i = this.agentPDBGroup.children.length - 1; i >= 0; i--) {
            this.agentPDBGroup.remove(this.agentPDBGroup.children[i]);
        }

        // set all runtime meshes back to spheres.
        for (const visAgent of this.visAgentInstances.values()) {
            visAgent.resetMesh();
            visAgent.resetPDB();
        }
    }

    public update(agents: AgentData[]): void {
        this.updateScene(agents);

        const numberOfAgents = agents.length;
        if (
            this.lastNumberOfAgents > numberOfAgents ||
            this.lastNumberOfAgents === 0
        ) {
            this.hideUnusedAgents(numberOfAgents);
        }
        this.lastNumberOfAgents = numberOfAgents;
    }
}

export { VisGeometry, NO_AGENT };
export default VisGeometry;
