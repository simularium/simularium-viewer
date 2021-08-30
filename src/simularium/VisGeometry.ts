import { WEBGL } from "three/examples/jsm/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
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
    Scene,
    Vector2,
    Vector3,
    WebGLRenderer,
    WebGLRendererParameters,
    Mesh,
    Quaternion,
    MOUSE,
} from "three";

import * as dat from "dat.gui";

import jsLogger from "js-logger";
import { ILogger, ILogLevel } from "js-logger";
import { cloneDeep, noop } from "lodash";

import VisAgent from "./VisAgent";
import VisTypes from "./VisTypes";
import PDBModel from "./PDBModel";
import FrontEndError from "./FrontEndError";

import { DEFAULT_CAMERA_Z_POSITION, DEFAULT_CAMERA_SPEC } from "../constants";
import {
    TrajectoryFileInfo,
    CameraSpec,
    EncodedTypeMapping,
    AgentDisplayDataWithGeometry,
} from "./types";
import { AgentData } from "./VisData";

import SimulariumRenderer from "./rendering/SimulariumRenderer";
import { InstancedFiberGroup } from "./rendering/InstancedFiber";
import { InstancedMesh } from "./rendering/InstancedMesh";
import { LegacyRenderer } from "./rendering/LegacyRenderer";
import GeometryStore, { DEFAULT_MESH_NAME } from "./VisGeometry/GeometryStore";
import { GeometryDisplayType, MeshLoadRequest } from "./VisGeometry/types";
import { checkAndSanitizePath } from "../util";

const MAX_PATH_LEN = 32;
const MAX_MESHES = 100000;
const DEFAULT_BACKGROUND_COLOR = new Color(0, 0, 0);
const DEFAULT_VOLUME_DIMENSIONS = [300, 300, 300];
// tick interval length = length of the longest bounding box edge / NUM_TICK_INTERVALS
const NUM_TICK_INTERVALS = 10;
// tick mark length = 2 * (length of the longest bounding box edge / TICK_LENGTH_FACTOR)
const TICK_LENGTH_FACTOR = 100;
const BOUNDING_BOX_COLOR = new Color(0x6e6e6e);
const NO_AGENT = -1;
const CAMERA_DOLLY_STEP_SIZE = 10;

export enum RenderStyle {
    WEBGL1_FALLBACK,
    WEBGL2_PREFERRED,
}

function lerp(x0: number, x1: number, alpha: number): number {
    return x0 + (x1 - x0) * alpha;
}

function removeByName(group: Group, name: string): void {
    const childrenToRemove: Object3D[] = [];
    group.traverse((child) => {
        if (child.name == name) {
            childrenToRemove.push(child);
        }
    });
    childrenToRemove.forEach(function (child) {
        group.remove(child);
    });
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
    line: LineSegments;
}

type Bounds = readonly [number, number, number, number, number, number];

class VisGeometry {
    public onError: (errorMessage: string) => void;
    public renderStyle: RenderStyle;
    public backgroundColor: Color;
    public pathEndColor: Color;
    // maps agent type id to agent geometry name
    public visGeomMap: Map<number, string>;
    public geometryStore: GeometryStore;
    public scaleMapping: Map<number, number>;
    public followObjectId: number;
    public visAgents: VisAgent[];
    public visAgentInstances: Map<number, VisAgent>;
    public fixLightsToCamera: boolean;
    public highlightedIds: number[];
    public hiddenIds: number[];
    public paths: PathData[];
    public mlogger: ILogger;
    // this is the threejs object that issues all the webgl calls
    public threejsrenderer: WebGLRenderer;
    public scene: Scene;
    public camera: PerspectiveCamera;
    public controls: OrbitControls;
    public dl: DirectionalLight;
    public boundingBox: Box3;
    public boundingBoxMesh: Box3Helper;
    public tickIntervalLength: number;
    public tickMarksMesh: LineSegments;
    // front and back of transformed bounds in camera space
    private boxNearZ: number;
    private boxFarZ: number;

    public hemiLight: HemisphereLight;
    public renderer: SimulariumRenderer;
    public legacyRenderer: LegacyRenderer;
    public atomSpread = 3.0;
    public numAtomsPerAgent = 8;
    public currentSceneAgents: AgentData[];
    public colorsData: Float32Array;
    public lightsGroup: Group;
    public agentPDBGroup: Group;
    public agentPathGroup: Group;
    public instancedMeshGroup: Group;
    public idColorMapping: Map<number, number>;
    private isIdColorMappingSet: boolean;
    private supportsWebGL2Rendering: boolean;
    private lodBias: number;
    private lodDistanceStops: number[];
    private needToCenterCamera: boolean;
    private needToReOrientCamera: boolean;
    private rotateDistance: number;
    private initCameraPosition: Vector3;
    private cameraDefault: CameraSpec;
    private fibers: InstancedFiberGroup;
    private focusMode: boolean;

    public constructor(loggerLevel: ILogLevel) {
        this.renderStyle = RenderStyle.WEBGL1_FALLBACK;
        this.supportsWebGL2Rendering = false;

        this.visGeomMap = new Map<number, string>();
        this.geometryStore = new GeometryStore(
            this.onNewRuntimeGeometryType.bind(this)
        );
        this.geometryStore.init();

        this.scaleMapping = new Map<number, number>();
        this.idColorMapping = new Map<number, number>();
        this.isIdColorMappingSet = false;
        this.followObjectId = NO_AGENT;
        this.visAgents = [];
        this.visAgentInstances = new Map<number, VisAgent>();
        this.fixLightsToCamera = true;
        this.highlightedIds = [];
        this.hiddenIds = [];
        this.needToCenterCamera = false;
        this.needToReOrientCamera = false;
        this.rotateDistance = DEFAULT_CAMERA_Z_POSITION;
        // will store data for all agents that are drawing paths
        this.paths = [];

        this.fibers = new InstancedFiberGroup();

        this.scene = new Scene();
        this.lightsGroup = new Group();
        this.agentPDBGroup = new Group();
        this.agentPathGroup = new Group();
        this.instancedMeshGroup = new Group();

        this.setupScene();

        this.legacyRenderer = new LegacyRenderer();
        this.renderer = new SimulariumRenderer();

        this.backgroundColor = DEFAULT_BACKGROUND_COLOR;
        this.pathEndColor = this.backgroundColor.clone();
        this.renderer.setBackgroundColor(this.backgroundColor);

        this.mlogger = jsLogger.get("visgeometry");
        this.mlogger.setLevel(loggerLevel);

        this.camera = new PerspectiveCamera(75, 100 / 100, 0.1, 10000);

        this.initCameraPosition = this.camera.position.clone();
        this.cameraDefault = cloneDeep(DEFAULT_CAMERA_SPEC);

        this.dl = new DirectionalLight(0xffffff, 0.6);
        this.hemiLight = new HemisphereLight(0xffffff, 0x000000, 0.5);
        this.threejsrenderer = new WebGLRenderer({ premultipliedAlpha: false });
        this.controls = new OrbitControls(
            this.camera,
            this.threejsrenderer.domElement
        );
        this.setPanningMode(false);
        this.focusMode = true;

        this.boundingBox = new Box3(
            new Vector3(0, 0, 0),
            new Vector3(100, 100, 100)
        );
        this.boundingBoxMesh = new Box3Helper(
            this.boundingBox,
            BOUNDING_BOX_COLOR
        );
        this.tickIntervalLength = 0;
        this.tickMarksMesh = new LineSegments();
        this.boxNearZ = 0;
        this.boxFarZ = 100;
        this.currentSceneAgents = [];
        this.colorsData = new Float32Array(0);
        this.lodBias = 0;
        this.lodDistanceStops = [40, 100, 150, Number.MAX_VALUE];
        this.onError = (/*errorMessage*/) => noop;
        if (loggerLevel === jsLogger.DEBUG) {
            this.setupGui();
        }
    }

    public setOnErrorCallBack(onError: (msg: string) => void): void {
        this.onError = onError;
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
        this.renderer.setBackgroundColor(this.backgroundColor);
        this.threejsrenderer.setClearColor(this.backgroundColor, 1);
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

        this.renderer.setupGui(gui);
    }

    public setRenderStyle(renderStyle: RenderStyle): void {
        // if target render style is supported, then change, otherwise don't.
        if (
            renderStyle === RenderStyle.WEBGL2_PREFERRED &&
            !this.supportsWebGL2Rendering
        ) {
            console.log("Warning: WebGL2 rendering not supported");
            return;
        }

        const changed = this.renderStyle !== renderStyle;
        this.renderStyle = renderStyle;

        if (changed) {
            this.constructInstancedFibers();
        }

        this.updateScene(this.currentSceneAgents);
    }

    private constructInstancedFibers() {
        this.fibers.clear();
        removeByName(this.instancedMeshGroup, InstancedFiberGroup.GROUP_NAME);

        // tell instanced geometry what representation to use.
        if (this.renderStyle === RenderStyle.WEBGL2_PREFERRED) {
            this.fibers = new InstancedFiberGroup();
        }

        this.instancedMeshGroup.add(this.fibers.getGroup());
    }

    public get logger(): ILogger {
        return this.mlogger;
    }

    public get renderDom(): HTMLElement {
        return this.threejsrenderer.domElement;
    }

    public handleTrajectoryFileInfo(
        trajectoryFileInfo: TrajectoryFileInfo
    ): void {
        this.handleBoundingBoxData(trajectoryFileInfo);
        this.handleCameraData(trajectoryFileInfo.cameraDefault);
        this.handleAgentGeometry(trajectoryFileInfo.typeMapping);
    }

    private handleBoundingBoxData(trajectoryFileInfo: TrajectoryFileInfo) {
        // Create a new bounding box and tick marks and set this.tickIntervalLength (via resetBounds()),
        // to make it available for use as the length of the scale bar in the UI
        if (trajectoryFileInfo.hasOwnProperty("size")) {
            const bx = trajectoryFileInfo.size.x;
            const by = trajectoryFileInfo.size.y;
            const bz = trajectoryFileInfo.size.z;
            const epsilon = 0.000001;
            if (
                Math.abs(bx) < epsilon ||
                Math.abs(by) < epsilon ||
                Math.abs(bz) < epsilon
            ) {
                console.log(
                    "WARNING: Bounding box: at least one bound is zero; using default bounds"
                );
                this.resetBounds(DEFAULT_VOLUME_DIMENSIONS);
            } else {
                this.resetBounds([bx, by, bz]);
            }
        } else {
            this.resetBounds(DEFAULT_VOLUME_DIMENSIONS);
        }
    }

    private handleCameraData(cameraDefault: CameraSpec) {
        // Get default camera transform values from data
        if (cameraDefault) {
            this.cameraDefault = cameraDefault;
        } else {
            this.logger.warn(
                "Using default camera settings since none were provided"
            );
            this.cameraDefault = cloneDeep(DEFAULT_CAMERA_SPEC);
        }
        this.resetCamera();
    }

    // Called when a new file is loaded, the Clear button is clicked, or Reset Camera button is clicked
    public resetCamera(): void {
        this.followObjectId = NO_AGENT;
        this.controls.reset();
        this.resetCameraPosition();
    }

    // Sets camera position and orientation to the trajectory's initial (default) values
    public resetCameraPosition(): void {
        const { position, upVector, lookAtPosition, fovDegrees } =
            this.cameraDefault;

        // Reset camera position
        this.camera.position.set(position.x, position.y, position.z);
        this.initCameraPosition = this.camera.position.clone();

        // Reset up vector (needs to be a unit vector)
        const normalizedUpVector = new Vector3(
            upVector.x,
            upVector.y,
            upVector.z
        ).normalize();
        this.camera.up.set(
            normalizedUpVector.x,
            normalizedUpVector.y,
            normalizedUpVector.z
        );

        // Reset lookat position
        this.camera.lookAt(
            lookAtPosition.x,
            lookAtPosition.y,
            lookAtPosition.z
        );
        this.controls.target.set(
            lookAtPosition.x,
            lookAtPosition.y,
            lookAtPosition.z
        );

        // Reset field of view
        this.camera.fov = fovDegrees;

        // Apply the changes above
        this.camera.updateProjectionMatrix();
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

    private dolly(changeBy: number): void {
        const position = this.camera.position.clone();
        const target = this.controls.target.clone();
        const distance = position.distanceTo(target);
        const newDistance = distance + changeBy;
        if (
            newDistance <= this.controls.minDistance ||
            newDistance >= this.controls.maxDistance
        ) {
            return;
        }
        const newPosition = new Vector3()
            .subVectors(position, target)
            .setLength(newDistance);
        this.camera.position.copy(
            new Vector3().addVectors(newPosition, target)
        );
    }

    public zoomIn(): void {
        const changeBy = -CAMERA_DOLLY_STEP_SIZE;
        this.dolly(changeBy);
    }

    public zoomOut(): void {
        const changeBy = CAMERA_DOLLY_STEP_SIZE;
        this.dolly(changeBy);
    }

    public setPanningMode(pan: boolean): void {
        if (!pan) {
            this.controls.enablePan = true;
            this.controls.enableRotate = true;
            this.controls.mouseButtons = {
                LEFT: MOUSE.ROTATE,
                MIDDLE: MOUSE.DOLLY,
                RIGHT: MOUSE.PAN,
            };
        } else {
            this.controls.enablePan = true;
            this.controls.enableRotate = true;
            this.controls.mouseButtons = {
                LEFT: MOUSE.PAN,
                MIDDLE: MOUSE.DOLLY,
                RIGHT: MOUSE.ROTATE,
            };
        }
    }

    public setFocusMode(focus: boolean): void {
        this.focusMode = focus;
    }

    public getFollowObject(): number {
        return this.followObjectId;
    }

    public setFollowObject(obj: number): void {
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
        this.updateScene(this.currentSceneAgents);
    }

    public unfollow(): void {
        this.setFollowObject(NO_AGENT);
    }

    public setVisibleByIds(hiddenIds: number[]): void {
        this.hiddenIds = hiddenIds;
        this.updateScene(this.currentSceneAgents);
    }

    public setHighlightByIds(ids: number[]): void {
        this.highlightedIds = ids;
        this.updateScene(this.currentSceneAgents);
    }

    public dehighlight(): void {
        this.setHighlightByIds([]);
    }

    private getAllTypeIdsForGeometryName(name: string) {
        return [...this.visGeomMap.entries()]
            .filter(({ 1: v }) => v === name)
            .map(([k]) => k);
    }
    public onNewRuntimeGeometryType(
        geoName: string,
        displayType: GeometryDisplayType,
        data: PDBModel | MeshLoadRequest
    ): void {
        // find all typeIds for this meshName
        const typeIds = this.getAllTypeIdsForGeometryName(geoName);

        // assuming the meshLoadRequest has already been added to the registry
        if (data === undefined) {
            console.error(`Mesh name ${geoName} not found in mesh registry`);
            return;
        }

        // go over all objects and update mesh of this typeId
        // if this happens before the first updateScene, then the visAgents don't have type id's yet.
        const nMeshes = this.visAgents.length;
        for (let i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
            const visAgent = this.visAgents[i];
            if (typeIds.includes(visAgent.agentData.type)) {
                if (displayType === GeometryDisplayType.PDB) {
                    this.resetAgentPDB(visAgent, data);
                }
                visAgent.setColor(
                    this.getColorForTypeId(visAgent.agentData.type),
                    this.getColorIndexForTypeId(visAgent.agentData.type)
                );
            }
        }

        this.updateScene(this.currentSceneAgents);
    }

    private resetAgentPDB(visAgent, pdb?): void {
        for (let lod = 0; lod < visAgent.pdbObjects.length; ++lod) {
            this.agentPDBGroup.remove(visAgent.pdbObjects[lod]);
        }
        if (pdb) {
            visAgent.setupPdb(pdb);
            for (let lod = 0; lod < visAgent.pdbObjects.length; ++lod) {
                this.agentPDBGroup.add(visAgent.pdbObjects[lod]);
            }
        } else {
            visAgent.resetPDB();
        }
    }

    public setUpControls(element: HTMLElement): void {
        this.controls = new OrbitControls(this.camera, element);
        this.controls.maxDistance = 750;
        this.controls.minDistance = 5;
        this.controls.zoomSpeed = 1.0;
        this.setPanningMode(false);
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
        this.agentPDBGroup = new Group();
        this.agentPDBGroup.name = "agent pdbs";
        this.scene.add(this.agentPDBGroup);
        this.agentPathGroup = new Group();
        this.agentPathGroup.name = "agent paths";
        this.scene.add(this.agentPathGroup);
        this.instancedMeshGroup = new Group();
        this.instancedMeshGroup.name = "instanced meshes for agents";
        this.scene.add(this.instancedMeshGroup);

        this.camera = new PerspectiveCamera(
            75,
            initWidth / initHeight,
            0.1,
            1000
        );

        this.resetBounds(DEFAULT_VOLUME_DIMENSIONS);

        this.dl = new DirectionalLight(0xffffff, 0.6);
        this.dl.position.set(0, 0, 1);
        this.lightsGroup.add(this.dl);

        this.hemiLight = new HemisphereLight(0xffffff, 0x000000, 0.5);
        this.hemiLight.color.setHSL(0.095, 1, 0.75);
        this.hemiLight.groundColor.setHSL(0.6, 1, 0.6);
        this.hemiLight.position.set(0, 1, 0);
        this.lightsGroup.add(this.hemiLight);

        if (WEBGL.isWebGL2Available() === false) {
            this.renderStyle = RenderStyle.WEBGL1_FALLBACK;
            this.supportsWebGL2Rendering = false;
            this.threejsrenderer = new WebGLRenderer({
                premultipliedAlpha: false,
            });
        } else {
            this.renderStyle = RenderStyle.WEBGL2_PREFERRED;
            this.supportsWebGL2Rendering = true;
            const canvas = document.createElement("canvas");
            const context: WebGLRenderingContext = canvas.getContext("webgl2", {
                alpha: false,
            }) as WebGLRenderingContext;

            const rendererParams: WebGLRendererParameters = {
                canvas: canvas,
                context: context,
                premultipliedAlpha: false,
            };
            this.threejsrenderer = new WebGLRenderer(rendererParams);
        }

        // set this up after the renderStyle has been set.
        this.constructInstancedFibers();

        this.threejsrenderer.setSize(initWidth, initHeight); // expected to change when reparented
        this.threejsrenderer.setClearColor(this.backgroundColor, 1);
        this.threejsrenderer.clear();

        this.camera.position.z = DEFAULT_CAMERA_Z_POSITION;
        this.initCameraPosition = this.camera.position.clone();
    }

    public resize(width: number, height: number): void {
        // at least 2x2 in size when resizing, to prevent bad buffer sizes
        width = Math.max(width, 2);
        height = Math.max(height, 2);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.threejsrenderer.setSize(width, height);
        this.renderer.resize(width, height);
    }

    public reparent(parent?: HTMLElement | null): void {
        if (parent === undefined || parent == null) {
            return;
        }

        parent.appendChild(this.threejsrenderer.domElement);
        this.setUpControls(this.threejsrenderer.domElement);

        this.resize(parent.scrollWidth, parent.scrollHeight);

        this.threejsrenderer.setClearColor(this.backgroundColor, 1.0);
        this.threejsrenderer.clear();

        this.threejsrenderer.domElement.setAttribute(
            "style",
            "top: 0px; left: 0px"
        );

        this.threejsrenderer.domElement.onmouseenter = () =>
            this.enableControls();
        this.threejsrenderer.domElement.onmouseleave = () =>
            this.disableControls();
    }

    public disableControls(): void {
        this.controls.enabled = false;
    }

    public enableControls(): void {
        this.controls.enabled = true;
    }

    public render(_time: number): void {
        if (this.visAgents.length === 0) {
            this.threejsrenderer.clear();
            return;
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

        // remove all children of instancedMeshGroup.  we will re-add them.
        for (let i = this.instancedMeshGroup.children.length - 1; i >= 0; i--) {
            this.instancedMeshGroup.remove(this.instancedMeshGroup.children[i]);
        }

        // re-add fibers immediately
        this.instancedMeshGroup.add(this.fibers.getGroup());

        if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
            // meshes only.
            this.threejsrenderer.render(this.scene, this.camera);
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
                            new Vector3(
                                agent.agentData.x,
                                agent.agentData.y,
                                agent.agentData.z
                            )
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

            // collect up the meshes that have > 0 instances
            const meshTypes: InstancedMesh[] = [];
            for (const entry of this.geometryStore.getAllMeshes().values()) {
                console.log(entry);
                const { geometry } = entry;
                meshTypes.push(geometry.instances);
                this.instancedMeshGroup.add(geometry.instances.getMesh());
            }

            this.renderer.setMeshGroups(
                this.agentPDBGroup,
                this.instancedMeshGroup,
                this.fibers,
                meshTypes
            );
            this.renderer.setFollowedInstance(this.followObjectId);
            this.renderer.setNearFar(this.boxNearZ, this.boxFarZ);
            this.boundingBoxMesh.visible = false;
            this.tickMarksMesh.visible = false;
            this.agentPathGroup.visible = false;
            this.renderer.render(
                this.threejsrenderer,
                this.scene,
                this.camera,
                null
            );

            // final pass, add extra stuff on top: bounding box and line paths
            this.boundingBoxMesh.visible = true;
            this.tickMarksMesh.visible = true;
            this.agentPathGroup.visible = true;

            this.threejsrenderer.autoClear = false;
            // hide everything except the wireframe and paths, and render with the standard renderer
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = false;
            this.threejsrenderer.render(this.scene, this.camera);
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = true;
            this.threejsrenderer.autoClear = true;

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
        this.threejsrenderer.getSize(size);
        if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
            const mouse = {
                x: (offsetX / size.x) * 2 - 1,
                y: -(offsetY / size.y) * 2 + 1,
            };
            return this.legacyRenderer.hitTest(mouse, this.camera);
        } else {
            // read from instance buffer pixel!
            return this.renderer.hitTest(
                this.threejsrenderer,
                offsetX,
                size.y - offsetY
            );
        }
    }

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
        this.renderer.updateColors(numColors, this.colorsData);

        this.visAgents.forEach((agent) => {
            agent.setColor(
                this.getColorForTypeId(agent.agentData.type),
                this.getColorIndexForTypeId(agent.agentData.type)
            );
        });
    }

    public clearColorMapping(): void {
        this.idColorMapping.clear();
        this.isIdColorMappingSet = false;
    }

    private getColorIndexForTypeId(typeId: number): number {
        const index = this.idColorMapping.get(typeId);
        if (index === undefined) {
            console.log("getColorIndexForTypeId could not find " + typeId);
            return 0;
        }
        return index % (this.colorsData.length / 4);
    }

    private getColorForTypeId(typeId: number): Color {
        const index = this.getColorIndexForTypeId(typeId);
        return this.getColorForIndex(index);
    }

    public setColorForIds(ids: number[], colorId: number): void {
        if (this.isIdColorMappingSet) {
            throw new FrontEndError(
                "Attempted to set agent-color after color mapping was finalized"
            );
        }

        ids.forEach((id) => {
            this.idColorMapping.set(id, colorId);

            // if we don't have a mesh for this, add a sphere instance to mesh registry?
            if (!this.visGeomMap.has(id)) {
                this.visGeomMap.set(id, DEFAULT_MESH_NAME);
            }
        });
    }

    public getColorForIndex(index: number): Color {
        return new Color(
            this.colorsData[index * 4],
            this.colorsData[index * 4 + 1],
            this.colorsData[index * 4 + 2]
        );
    }

    public finalizeIdColorMapping(): void {
        this.isIdColorMappingSet = true;
    }

    /**
     *   Data Management
     */
    public resetMapping(): void {
        this.resetAllGeometry();
        this.visGeomMap.clear();
        this.geometryStore.init();
        this.scaleMapping.clear();
    }

    private getGeoKeyForId(id: number): string | null {
        const name = this.visGeomMap.get(id);
        return name || null;
    }

    public handleAgentGeometry(typeMapping: EncodedTypeMapping): void {
        this.clearForNewTrajectory();
        this.setGeometryData(typeMapping);
    }

    private setGeometryData(typeMapping: EncodedTypeMapping): void {
        this.logger.debug("Received type mapping data: ", typeMapping);
        Object.keys(typeMapping).forEach((id) => {
            const entry: AgentDisplayDataWithGeometry = typeMapping[id];
            const { url, displayType } = entry.geometry;
            const key = url ? checkAndSanitizePath(url) : displayType;
            this.visGeomMap.set(Number(id), key);
            // NOTE: It would be nice to be able to have this return a promise and
            // be able to call onNewGeometry from here instead of as a callback
            this.geometryStore.mapKeyToGeom(Number(id), entry.geometry);
        });
        // NOTE: do we need this call here?
        // Seems to only ever be called with an empty array.
        if (this.currentSceneAgents.length) {
            console.log(
                "Need to update scene with current agents:",
                this.currentSceneAgents
            );
        }
        this.updateScene(this.currentSceneAgents);
    }

    public setTickIntervalLength(axisLength: number): void {
        const tickIntervalLength = axisLength / NUM_TICK_INTERVALS;
        // TODO: round tickIntervalLength to a nice number
        this.tickIntervalLength = tickIntervalLength;
    }

    public createTickMarks(
        volumeDimensions: number[],
        boundsAsTuple: Bounds
    ): void {
        const [minX, minY, minZ, maxX, maxY, maxZ] = boundsAsTuple;
        const visible = this.tickMarksMesh ? this.tickMarksMesh.visible : true;

        const longestEdgeLength = Math.max(...volumeDimensions);
        // Use the length of the longest bounding box edge to determine the tick interval (scale bar) length
        this.setTickIntervalLength(longestEdgeLength);
        // The size of tick marks also depends on the length of the longest bounding box edge
        const tickHalfLength = longestEdgeLength / TICK_LENGTH_FACTOR;

        const lineGeometry = new BufferGeometry();
        const verticesArray: number[] = [];

        // Add tick mark vertices for the 4 bounding box edges parallel to the x-axis
        // TODO: May be good to refactor to make less redundant, see Megan's suggestion:
        // https://github.com/allen-cell-animated/simularium-viewer/pull/75#discussion_r535519106
        let x: number = minX;
        while (x <= maxX) {
            verticesArray.push(
                // The 6 coordinates below make up 1 tick mark (2 vertices for 1 line segment)
                x,
                minY,
                minZ + tickHalfLength,
                x,
                minY,
                minZ - tickHalfLength,

                // This tick mark is on a different bounding box edge also parallel to the x-axis
                x,
                minY,
                maxZ + tickHalfLength,
                x,
                minY,
                maxZ - tickHalfLength,

                // This tick mark is on yet another edge parallel to the x-axis
                x,
                maxY,
                minZ + tickHalfLength,
                x,
                maxY,
                minZ - tickHalfLength,

                // For the last edge parallel to the x-axis
                x,
                maxY,
                maxZ + tickHalfLength,
                x,
                maxY,
                maxZ - tickHalfLength
            );
            x += this.tickIntervalLength;
        }

        // Add tick mark vertices for the 4 bounding box edges parallel to the y-axis
        let y: number = minY;
        while (y <= maxY) {
            verticesArray.push(
                minX + tickHalfLength,
                y,
                minZ,
                minX - tickHalfLength,
                y,
                minZ,

                minX + tickHalfLength,
                y,
                maxZ,
                minX - tickHalfLength,
                y,
                maxZ,

                maxX + tickHalfLength,
                y,
                minZ,
                maxX - tickHalfLength,
                y,
                minZ,

                maxX + tickHalfLength,
                y,
                maxZ,
                maxX - tickHalfLength,
                y,
                maxZ
            );
            y += this.tickIntervalLength;
        }

        // Add tick mark vertices for the 4 bounding box edges parallel to the z-axis
        let z: number = minZ;
        while (z <= maxZ) {
            verticesArray.push(
                minX,
                minY + tickHalfLength,
                z,
                minX,
                minY - tickHalfLength,
                z,

                minX,
                maxY + tickHalfLength,
                z,
                minX,
                maxY - tickHalfLength,
                z,

                maxX,
                minY + tickHalfLength,
                z,
                maxX,
                minY - tickHalfLength,
                z,

                maxX,
                maxY + tickHalfLength,
                z,
                maxX,
                maxY - tickHalfLength,
                z
            );
            z += this.tickIntervalLength;
        }

        // Convert verticesArray into a TypedArray to use with lineGeometry.setAttribute()
        const vertices = new Float32Array(verticesArray);
        lineGeometry.setAttribute("position", new BufferAttribute(vertices, 3));

        const lineMaterial = new LineBasicMaterial({
            color: BOUNDING_BOX_COLOR,
        });
        this.tickMarksMesh = new LineSegments(lineGeometry, lineMaterial);
        this.tickMarksMesh.visible = visible;
    }

    public createBoundingBox(boundsAsTuple: Bounds): void {
        const [minX, minY, minZ, maxX, maxY, maxZ] = boundsAsTuple;
        const visible = this.boundingBoxMesh
            ? this.boundingBoxMesh.visible
            : true;
        this.boundingBox = new Box3(
            new Vector3(minX, minY, minZ),
            new Vector3(maxX, maxY, maxZ)
        );
        this.boundingBoxMesh = new Box3Helper(
            this.boundingBox,
            BOUNDING_BOX_COLOR
        );
        this.boundingBoxMesh.visible = visible;
    }

    public resetBounds(volumeDimensions?: number[]): void {
        this.scene.remove(this.boundingBoxMesh, this.tickMarksMesh);
        if (!volumeDimensions) {
            console.log("invalid volume dimensions received");
            return;
        }
        const [bx, by, bz] = volumeDimensions;
        const boundsAsTuple: Bounds = [
            -bx / 2,
            -by / 2,
            -bz / 2,
            bx / 2,
            by / 2,
            bz / 2,
        ];
        this.createBoundingBox(boundsAsTuple);
        this.createTickMarks(volumeDimensions, boundsAsTuple);
        this.scene.add(this.boundingBoxMesh, this.tickMarksMesh);

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

    private createAgent(): VisAgent {
        // TODO limit the number
        const i = this.visAgents.length;
        const agent = new VisAgent(`Agent_${i}`);
        this.visAgents.push(agent);
        return agent;
    }

    /**
     *   Update Scene
     **/
    private updateScene(agents: AgentData[]): void {
        if (!this.isIdColorMappingSet) {
            return;
        }
        this.currentSceneAgents = agents;

        let dx = 0,
            dy = 0,
            dz = 0;
        let lastx = 0,
            lasty = 0,
            lastz = 0;

        this.legacyRenderer.beginUpdate(this.scene);

        this.fibers.beginUpdate();
        this.geometryStore.updateMeshes();
        // First, mark ALL inactive and invisible.
        // Note this implies a memory leak of sorts:
        // the number of agent instances can only grow during one trajectory run.
        // We just hide the unused ones.
        // Worst case is if each frame uses completely different (incrementing) instance ids.
        for (let i = 0; i < MAX_MESHES && i < this.visAgents.length; i += 1) {
            const visAgent = this.visAgents[i];
            visAgent.hideAndDeactivate();
        }

        agents.forEach((agentData) => {
            const visType = agentData["vis-type"];
            const instanceId = agentData.instanceId;
            const typeId = agentData.type;
            const scale = this.getScaleForId(typeId);
            const radius = agentData.cr ? agentData.cr : 1;

            lastx = agentData.x;
            lasty = agentData.y;
            lastz = agentData.z;

            // look up last agent with this instanceId.
            let visAgent = this.visAgentInstances.get(instanceId);

            const path = this.findPathForAgent(instanceId);
            if (path) {
                if (visAgent) {
                    lastx = visAgent.agentData.x;
                    lasty = visAgent.agentData.y;
                    lastz = visAgent.agentData.z;
                }
            }

            if (!visAgent) {
                visAgent = this.createAgent();
                visAgent.agentData.instanceId = instanceId;
                //visAgent.mesh.userData = { id: instanceId };
                this.visAgentInstances.set(instanceId, visAgent);
                // set hidden so that it is revealed later in this function:
                visAgent.hidden = true;
            }

            if (visAgent.agentData.instanceId !== instanceId) {
                console.warn(
                    `incoming instance id ${instanceId} mismatched with visagent ${visAgent.agentData.instanceId}`
                );
            }

            visAgent.active = true;

            // update the agent!
            visAgent.agentData = agentData;

            const isHighlighted = this.highlightedIds.includes(
                visAgent.agentData.type
            );
            visAgent.setHighlighted(isHighlighted);

            const isHidden = this.hiddenIds.includes(visAgent.agentData.type);
            visAgent.setHidden(isHidden);
            if (visAgent.hidden) {
                // don't bother to update if type changed while agent is hidden?
                visAgent.hide();
                return;
            }

            visAgent.setColor(
                this.getColorForTypeId(typeId),
                this.getColorIndexForTypeId(typeId)
            );

            // if not fiber...
            if (visType === VisTypes.ID_VIS_TYPE_DEFAULT) {
                const entryName = this.getGeoKeyForId(typeId);
                if (!entryName) {
                    return;
                }

                const response =
                    this.geometryStore.getGeoForAgentType(entryName);
                if (!response) {
                    console.warn(
                        `No mesh nor pdb available for ${typeId}? Should be unreachable code`
                    );
                    return;
                }
                const { geometry, displayType } = response;
                if (geometry && displayType === GeometryDisplayType.PDB) {
                    const pdbEntry = geometry as PDBModel;
                    if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
                        this.legacyRenderer.addPdb(
                            pdbEntry,
                            visAgent,
                            this.getColorForTypeId(typeId)
                        );
                    } else {
                        if (pdbEntry !== visAgent.pdbModel) {
                            // race condition? agents arrived after pdb did?
                            this.resetAgentPDB(visAgent, pdbEntry);
                        }
                        visAgent.updatePdbTransform(1.0);
                    }
                } else {
                    // assumed displayType is GeometryDisplayType.ObjDisplayType here?
                    const meshEntry = geometry as MeshLoadRequest;

                    // Was previously a PDB object, but in it's new state will be drawn as a mesh
                    if (visAgent.hasDrawablePDB()) {
                        this.resetAgentPDB(visAgent);
                    }
                    const meshGeom = meshEntry.mesh;
                    if (!meshGeom) {
                        console.warn(
                            "MeshEntry is present but mesh unavailable. Not rendering agent."
                        );
                    }
                    if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
                        this.legacyRenderer.addMesh(
                            (meshGeom as Mesh).geometry,
                            visAgent,
                            radius * scale,
                            this.getColorForTypeId(typeId)
                        );
                    } else {
                        if (meshEntry && meshEntry.instances) {
                            meshEntry.instances.addInstance(
                                agentData.x,
                                agentData.y,
                                agentData.z,
                                radius * scale,
                                agentData.xrot,
                                agentData.yrot,
                                agentData.zrot,
                                visAgent.agentData.instanceId,
                                visAgent.signedTypeId()
                            );
                        }
                    }
                }

                dx = agentData.x - lastx;
                dy = agentData.y - lasty;
                dz = agentData.z - lastz;

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
                visAgent.updateFiber(agentData.subpoints);

                if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
                    this.legacyRenderer.addFiber(
                        visAgent,
                        agentData.cr * scale,
                        this.getColorForTypeId(typeId)
                    );
                } else {
                    // update/add to render list
                    this.fibers.addInstance(
                        agentData.subpoints.length / 3,
                        agentData.subpoints,
                        agentData.x,
                        agentData.y,
                        agentData.z,
                        agentData.cr * scale * 0.5,
                        visAgent.agentData.instanceId,
                        visAgent.signedTypeId()
                    );
                }
            }
        });

        this.fibers.endUpdate();
        this.geometryStore.endUpdateMeshes();
        this.legacyRenderer.endUpdate(this.scene);
    }

    public animateCamera(): void {
        const lerpTarget = true;
        const lerpPosition = true;
        const lerpRate = 0.2;
        const distanceBuffer = 0.002;
        const rotationBuffer = 0.01;
        if (this.followObjectId !== NO_AGENT && this.focusMode) {
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
            return path.agentId === id;
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
            vertexColors: true,
        });

        const lineObject = new LineSegments(lineGeometry, lineMaterial);
        lineObject.frustumCulled = false;

        const pathdata: PathData = {
            agentId: id,
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
            return path.agentId === id;
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
        this.agentPathGroup.remove(path.line);

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
            path.line.geometry.attributes.color.needsUpdate = true;
        }
        // add a segment to this line
        path.points[path.numSegments * 2 * 3 + 0] = x - dx;
        path.points[path.numSegments * 2 * 3 + 1] = y - dy;
        path.points[path.numSegments * 2 * 3 + 2] = z - dz;
        path.points[path.numSegments * 2 * 3 + 3] = x;
        path.points[path.numSegments * 2 * 3 + 4] = y;
        path.points[path.numSegments * 2 * 3 + 5] = z;

        path.numSegments++;

        path.line.geometry.setDrawRange(0, path.numSegments * 2);
        path.line.geometry.attributes.position.needsUpdate = true; // required after the first render
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
        this.tickMarksMesh.visible = showBounds;
    }

    public showPathForAgent(id: number, visible: boolean): void {
        const path = this.findPathForAgent(id);
        if (path) {
            if (path.line) {
                path.line.visible = visible;
            }
        }
    }

    public clearForNewTrajectory(): void {
        this.legacyRenderer.beginUpdate(this.scene);
        this.legacyRenderer.endUpdate(this.scene);
        this.resetMapping();

        // remove current scene agents.
        this.visAgentInstances.clear();
        this.visAgents = [];
        this.currentSceneAgents = [];

        this.dehighlight();
    }

    private resetAllGeometry(): void {
        this.geometryStore.cancelAll();

        this.unfollow();
        this.removeAllPaths();

        // remove geometry from all visible scene groups.
        // Object3D.remove can be slow, and just doing it in-order here
        // is faster than doing it in the loop over all visAgents
        this.legacyRenderer.beginUpdate(this.scene);
        this.legacyRenderer.endUpdate(this.scene);
        for (let i = this.agentPDBGroup.children.length - 1; i >= 0; i--) {
            this.agentPDBGroup.remove(this.agentPDBGroup.children[i]);
        }
        for (let i = this.instancedMeshGroup.children.length - 1; i >= 0; i--) {
            this.instancedMeshGroup.remove(this.instancedMeshGroup.children[i]);
        }

        // recreate an empty set of fibers to clear out the old ones.
        this.constructInstancedFibers();

        // set all runtime meshes back to spheres.
        for (const visAgent of this.visAgentInstances.values()) {
            visAgent.resetMesh();
            visAgent.resetPDB();
        }
    }

    public update(agents: AgentData[]): void {
        this.updateScene(agents);
    }
}

export { VisGeometry, NO_AGENT };
export default VisGeometry;
