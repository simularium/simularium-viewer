import WEBGL from "three/examples/jsm/capabilities/WebGL.js";
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
    Mesh,
    MOUSE,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Quaternion,
    Scene,
    Spherical,
    Vector2,
    Vector3,
    WebGLRenderer,
    WebGLRendererParameters,
} from "three";

import { Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import { ButtonGridApi } from "@tweakpane/plugin-essentials/dist/types/button-grid/api/button-grid";
import jsLogger from "js-logger";
import { ILogger, ILogLevel } from "js-logger";
import { cloneDeep, noop } from "lodash";

import VisAgent from "./VisAgent";
import VisTypes from "../simularium/VisTypes";
import PDBModel from "./PDBModel";
import VolumeModel from "./VolumeModel";
import AgentPath from "./agentPath";
import { FrontEndError, ErrorLevel } from "../simularium/FrontEndError";

import {
    DEFAULT_CAMERA_Z_POSITION,
    DEFAULT_CAMERA_SPEC,
    nullAgent,
    AGENT_HEADER_SIZE,
} from "../constants";
import {
    AgentData,
    AgentDisplayDataWithGeometry,
    CachedFrame,
    CameraSpec,
    Coordinates3d,
    EncodedTypeMapping,
    PerspectiveCameraSpec,
} from "../simularium/types";

import SimulariumRenderer from "./rendering/SimulariumRenderer";
import { InstancedFiberGroup } from "./rendering/InstancedFiber";
import { LegacyRenderer } from "./rendering/LegacyRenderer";
import GeometryStore from "./GeometryStore";
import {
    AgentGeometry,
    ColorAssignment,
    GeometryDisplayType,
    GeometryInstanceContainer,
    MeshGeometry,
    MeshLoadRequest,
    PDBGeometry,
} from "./types";
import {
    checkAndSanitizePath,
    getAgentDataFromBuffer,
    getNextAgentOffset,
    nullCachedFrame,
} from "../util";
import ColorHandler from "./ColorHandler";

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
const CAMERA_INITIAL_ZNEAR = 1.0;
const CAMERA_INITIAL_ZFAR = 1000.0;

const MAX_ZOOM = 120;
const MIN_ZOOM = 0.16;

const CANVAS_INITIAL_WIDTH = 100;
const CANVAS_INITIAL_HEIGHT = 100;

export enum RenderStyle {
    WEBGL1_FALLBACK,
    WEBGL2_PREFERRED,
}

function removeByName(group: Group, name: string): void {
    const childrenToRemove: Object3D[] = [];
    group.traverse((child) => {
        if (child.name == name) {
            childrenToRemove.push(child);
        }
    });
    childrenToRemove.forEach((child) => group.remove(child));
}

const coordsToVector = ({ x, y, z }: Coordinates3d) => new Vector3(x, y, z);

export const isOrthographicCamera = (
    def: PerspectiveCamera | OrthographicCamera
): def is OrthographicCamera =>
    def && !!(def as OrthographicCamera).isOrthographicCamera;

type Bounds = readonly [number, number, number, number, number, number];

class VisGeometry {
    public onError: (error: FrontEndError) => void;
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
    private availableAgentPool: VisAgent[] = [];
    public fixLightsToCamera: boolean;
    public highlightedIds: number[];
    public hiddenIds: number[];
    public agentPaths: Map<number, AgentPath>;
    public mlogger: ILogger;
    // this is the threejs object that issues all the webgl calls
    public threejsrenderer!: WebGLRenderer;
    public scene: Scene;

    public perspectiveCamera: PerspectiveCamera;
    public orthographicCamera: OrthographicCamera;
    public camera: PerspectiveCamera | OrthographicCamera;
    public controls!: OrbitControls;

    public dl: DirectionalLight;
    public hemiLight: HemisphereLight;
    public boundingBox!: Box3;
    public boundingBoxMesh!: Box3Helper;
    public tickMarksMesh!: LineSegments;
    public tickIntervalLength: number;
    // front and back of transformed bounds in camera space
    private boxNearZ: number;
    private boxFarZ: number;

    public colorHandler: ColorHandler;
    public renderer: SimulariumRenderer;
    public legacyRenderer: LegacyRenderer;
    public currentSceneData: CachedFrame;
    public colorsData: Float32Array;
    public lightsGroup: Group;
    public agentPathGroup: Group;
    public instancedMeshGroup: Group;
    public volumeGroup: Group; // TODO remove
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
    public gui?: Pane;

    private cam1: CameraSpec;
    private cam2: CameraSpec;
    private cam3: CameraSpec;

    // Scene update will populate these lists of visible pdb agents.
    // These lists are iterated at render time to detemine LOD.
    // This is because camera updates happen at a different frequency than scene updates.
    private agentsWithPdbsToDraw: VisAgent[];
    private agentPdbsToDraw: PDBModel[];

    public constructor(loggerLevel: ILogLevel) {
        this.cam1 = cloneDeep(DEFAULT_CAMERA_SPEC);
        this.cam2 = cloneDeep(DEFAULT_CAMERA_SPEC);
        this.cam3 = cloneDeep(DEFAULT_CAMERA_SPEC);

        this.renderStyle = RenderStyle.WEBGL1_FALLBACK;
        this.supportsWebGL2Rendering = false;

        this.visGeomMap = new Map<number, string>();
        this.geometryStore = new GeometryStore(loggerLevel);
        this.scaleMapping = new Map<number, number>();
        this.followObjectId = NO_AGENT;
        this.visAgents = [];
        this.visAgentInstances = new Map<number, VisAgent>();
        this.availableAgentPool = [];
        this.fixLightsToCamera = true;
        this.highlightedIds = [];
        this.hiddenIds = [];
        this.needToCenterCamera = false;
        this.needToReOrientCamera = false;
        this.rotateDistance = DEFAULT_CAMERA_Z_POSITION;
        // will store data for all agents that are drawing paths
        this.agentPaths = new Map<number, AgentPath>();

        this.fibers = new InstancedFiberGroup();

        this.legacyRenderer = new LegacyRenderer();
        this.renderer = new SimulariumRenderer();

        this.backgroundColor = DEFAULT_BACKGROUND_COLOR;
        this.pathEndColor = this.backgroundColor.clone();
        this.renderer.setBackgroundColor(this.backgroundColor);
        this.colorHandler = new ColorHandler();
        // Set up scene

        this.scene = new Scene();
        this.lightsGroup = new Group();
        this.lightsGroup.name = "lights";
        this.scene.add(this.lightsGroup);
        this.agentPathGroup = new Group();
        this.agentPathGroup.name = "agent paths";
        this.scene.add(this.agentPathGroup);
        this.instancedMeshGroup = new Group();
        this.instancedMeshGroup.name = "instanced meshes for agents";
        this.scene.add(this.instancedMeshGroup);
        this.volumeGroup = new Group();
        this.volumeGroup.name = "volumes";
        this.scene.add(this.volumeGroup);

        this.resetBounds(DEFAULT_VOLUME_DIMENSIONS);

        this.dl = new DirectionalLight(0xffffff, 0.6);
        this.dl.position.set(0, 0, 1);
        this.lightsGroup.add(this.dl);

        this.hemiLight = new HemisphereLight(0xffffff, 0x000000, 0.5);
        this.hemiLight.color.setHSL(0.095, 1, 0.75);
        this.hemiLight.groundColor.setHSL(0.6, 1, 0.6);
        this.hemiLight.position.set(0, 1, 0);
        this.lightsGroup.add(this.hemiLight);

        this.mlogger = jsLogger.get("visgeometry");
        this.mlogger.setLevel(loggerLevel);

        // Set up cameras

        this.cameraDefault = cloneDeep(DEFAULT_CAMERA_SPEC);
        const aspect = CANVAS_INITIAL_WIDTH / CANVAS_INITIAL_HEIGHT;
        this.perspectiveCamera = new PerspectiveCamera(
            75,
            aspect,
            CAMERA_INITIAL_ZNEAR,
            CAMERA_INITIAL_ZFAR
        );
        this.orthographicCamera = new OrthographicCamera();
        this.orthographicCamera.near = CAMERA_INITIAL_ZNEAR;
        this.orthographicCamera.far = CAMERA_INITIAL_ZFAR;
        this.updateOrthographicFrustum();
        this.camera = this.perspectiveCamera;

        this.camera.position.z = DEFAULT_CAMERA_Z_POSITION;
        this.initCameraPosition = this.camera.position.clone();

        this.focusMode = true;

        this.tickIntervalLength = 0;
        this.boxNearZ = 0;
        this.boxFarZ = 100;
        this.currentSceneData = nullCachedFrame();
        this.colorsData = new Float32Array(0);
        this.lodBias = 0;
        this.lodDistanceStops = [100, 200, 400, Number.MAX_VALUE];
        this.agentsWithPdbsToDraw = [];
        this.agentPdbsToDraw = [];

        this.onError = noop;
    }

    public setOnErrorCallBack(onError: (error: FrontEndError) => void): void {
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

    /**
     * Derive the default distance from camera to target from `cameraDefault`.
     * Unless `cameraDefault` has been meaningfully changed by a call to
     * `handleCameraData`, this will be equal to `DEFAULT_CAMERA_Z_POSITION`.
     */
    private getDefaultOrbitRadius(): number {
        const { position, lookAtPosition } = this.cameraDefault;
        const radius = coordsToVector(position).distanceTo(
            coordsToVector(lookAtPosition)
        );

        if (this.cameraDefault.orthographic) {
            return radius / this.cameraDefault.zoom;
        }
        return radius;
    }

    /** Set frustum of `orthographicCamera` from fov/aspect of `perspectiveCamera */
    private updateOrthographicFrustum(): void {
        const { fov, aspect } = this.perspectiveCamera;
        const halfFovRadians = (fov * Math.PI) / 360;

        // Distant objects are smaller in perspective but the same size in ortho.
        // Find default distance to target and set the frustum size to keep objects
        // at that distance the same size in both cameras.
        const orbitRadius = this.getDefaultOrbitRadius();
        const vSize = Math.tan(halfFovRadians) * orbitRadius;
        const hSize = vSize * aspect;

        this.orthographicCamera.left = -hSize;
        this.orthographicCamera.right = hSize;
        this.orthographicCamera.top = vSize;
        this.orthographicCamera.bottom = -vSize;
        this.orthographicCamera.updateProjectionMatrix();
    }

    private loadCamera(cameraSpec: CameraSpec): void {
        this.perspectiveCamera.fov = cameraSpec.fovDegrees;
        this.updateOrthographicFrustum();
        this.setCameraType(cameraSpec.orthographic);
        this.camera.position.copy(coordsToVector(cameraSpec.position));
        this.camera.up.copy(coordsToVector(cameraSpec.upVector));
        this.controls.target.copy(coordsToVector(cameraSpec.lookAtPosition));
        if (cameraSpec.orthographic) {
            this.orthographicCamera.zoom = cameraSpec.zoom;
        }
    }
    private storeCamera(cameraSpec?: CameraSpec): CameraSpec {
        const spec = cameraSpec || {
            ...cloneDeep(DEFAULT_CAMERA_SPEC),
            orthographic: false,
        };
        spec.position = this.camera.position.clone();
        spec.upVector = this.camera.up.clone();
        spec.lookAtPosition = this.controls.target.clone();
        spec.fovDegrees = this.perspectiveCamera.fov;

        spec.orthographic = !!(this.camera as OrthographicCamera)
            .isOrthographicCamera;
        if (spec.orthographic) {
            spec.zoom = this.orthographicCamera.zoom;
        }
        return spec;
    }

    public setupGui(container?: HTMLElement): void {
        this.gui = new Pane({
            title: "Advanced Settings",
            container: container,
        });
        this.gui.registerPlugin(EssentialsPlugin);

        const fcam = this.gui.addFolder({ title: "Camera" });
        // proxy breaks through reference, so we don't just bind persp/ortho camera
        const cameraProxy = new Proxy(this.camera, {
            get: (_, p) => this.camera[p],
        });
        fcam.addInput(cameraProxy, "position");
        fcam.addInput(this.controls, "target");
        const fovInput = fcam.addInput(this.perspectiveCamera, "fov");
        fovInput.on("change", () => this.updateOrthographicFrustum());

        [
            { camera: this.cam1, label: "Cam 1" },
            { camera: this.cam2, label: "Cam 2" },
            { camera: this.cam3, label: "Cam 3" },
        ].forEach(({ camera, label }) => {
            const grid: ButtonGridApi = this.gui?.addBlade({
                view: "buttongrid",
                size: [2, 1],
                cells: (x: number, y: number) => ({
                    title: [["Activate", "Save"]][y][x],
                }),
                label: label,
            }) as ButtonGridApi;
            grid.on("click", (ev) => {
                if (ev.index[0] === 0) {
                    this.loadCamera(camera);
                } else if (ev.index[0] === 1) {
                    this.storeCamera(camera);
                }
            });
        });

        this.gui.addButton({ title: "Export Cam" }).on("click", () => {
            const cam = this.storeCamera();
            const anchor = document.createElement("a");
            anchor.href = URL.createObjectURL(
                new Blob([JSON.stringify(cam, null, 2)], {
                    type: "text/plain",
                })
            );
            anchor.download = "camera.json";
            anchor.click();
        });
        this.gui.addButton({ title: "Import Cam" }).on("click", () => {
            const fileinput: HTMLInputElement = document.createElement("input");
            fileinput.type = "file";
            fileinput.style.display = "none";
            fileinput.addEventListener("change", (e: Event) => {
                const reader = new FileReader();
                reader.onload = (event: ProgressEvent<FileReader>) => {
                    const cam = JSON.parse(event?.target?.result as string);
                    this.loadCamera(cam);
                };
                const files = (e.target as HTMLInputElement).files;
                if (files !== null) {
                    reader.readAsText(files[0]);
                }
            });
            fileinput.click();
        });

        const settings = {
            lodBias: this.lodBias,
            lod0: this.lodDistanceStops[0],
            lod1: this.lodDistanceStops[1],
            lod2: this.lodDistanceStops[2],
            bgcolor: {
                r: this.backgroundColor.r * 255,
                g: this.backgroundColor.g * 255,
                b: this.backgroundColor.b * 255,
            },
        };

        this.gui.addInput(settings, "bgcolor").on("change", (event) => {
            this.setBackgroundColor([
                event.value.r / 255.0,
                event.value.g / 255.0,
                event.value.b / 255.0,
            ]);
        });
        this.gui.addButton({ title: "Capture Frame" }).on("click", () => {
            this.render(0);
            const dataUrl =
                this.threejsrenderer.domElement.toDataURL("image/png");
            const anchor = document.createElement("a");
            anchor.href = dataUrl;
            anchor.download = "screenshot.png";
            anchor.click();
            anchor.remove();
        });
        this.gui.addSeparator();
        const lodFolder = this.gui.addFolder({ title: "LoD", expanded: false });
        lodFolder
            .addInput(settings, "lodBias", { min: 0, max: 4, step: 1 })
            .on("change", (event) => {
                this.lodBias = event.value;
                this.updateScene(this.currentSceneData);
            });
        lodFolder.addInput(settings, "lod0").on("change", (event) => {
            this.lodDistanceStops[0] = event.value;
            this.updateScene(this.currentSceneData);
        });
        lodFolder.addInput(settings, "lod1").on("change", (event) => {
            this.lodDistanceStops[1] = event.value;
            this.updateScene(this.currentSceneData);
        });
        lodFolder.addInput(settings, "lod2").on("change", (event) => {
            this.lodDistanceStops[2] = event.value;
            this.updateScene(this.currentSceneData);
        });
        this.renderer.setupGui(this.gui);
    }

    public destroyGui(): void {
        if (this.gui) {
            this.gui.hidden = true;
            this.gui.dispose();
            this.gui = undefined;
        }
    }

    public setRenderStyle(renderStyle: RenderStyle): void {
        // if target render style is supported, then change, otherwise don't.
        if (
            renderStyle === RenderStyle.WEBGL2_PREFERRED &&
            !this.supportsWebGL2Rendering
        ) {
            this.logger.warn("Warning: WebGL2 rendering not supported");
            return;
        }

        const changed = this.renderStyle !== renderStyle;
        this.renderStyle = renderStyle;

        if (changed) {
            this.constructInstancedFibers();
        }

        this.updateScene(this.currentSceneData);
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

    public handleCameraData(cameraDefault?: PerspectiveCameraSpec): void {
        // Get default camera transform values from data
        if (cameraDefault) {
            this.cameraDefault = { ...cameraDefault, orthographic: false };
            this.updateOrthographicFrustum();
            this.updateControlsZoomBounds();
        } else {
            this.logger.info(
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
        const normalizedUpVector = coordsToVector(upVector).normalize();
        this.camera.up.copy(normalizedUpVector);

        // Reset lookat position
        const lookAtVector = coordsToVector(lookAtPosition);
        this.camera.lookAt(lookAtVector);
        this.controls.target.copy(lookAtVector);

        // Set fov (perspective) and frustum size (orthographic)
        this.perspectiveCamera.fov = fovDegrees;
        this.perspectiveCamera.updateProjectionMatrix();
        this.updateOrthographicFrustum();
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
        // TODO should we use the dolly method on OrbitControls here?
        const { minDistance, maxDistance } = this.controls;

        if ((this.camera as OrthographicCamera).isOrthographicCamera) {
            // Orthographic camera: dolly using zoom
            const defaultRadius = this.getDefaultOrbitRadius();
            const newDistance = defaultRadius / this.camera.zoom + changeBy;

            if (newDistance <= minDistance || newDistance >= maxDistance) {
                return;
            }

            this.camera.zoom = defaultRadius / newDistance;
        } else {
            // Perspective camera: actually change position
            const position = this.camera.position.clone();
            const target = this.controls.target.clone();
            const distance = position.distanceTo(target);
            const newDistance = distance + changeBy;

            if (newDistance <= minDistance || newDistance >= maxDistance) {
                return;
            }

            const newPosition = new Vector3()
                .subVectors(position, target)
                .setLength(newDistance);
            this.camera.position.copy(
                new Vector3().addVectors(newPosition, target)
            );
        }

        this.controls.update();
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

    public setAllowViewPanning(allow: boolean): void {
        this.controls.enablePan = allow;
    }

    public setFocusMode(focus: boolean): void {
        this.focusMode = focus;
    }

    public getObjectData(id: number): AgentData {
        const data = this.visAgentInstances.get(id);
        if (!data) {
            return nullAgent();
        }
        return data.agentData;
    }

    public getFollowObject(): number {
        return this.followObjectId;
    }

    public setFollowObject(obj: number): void {
        if (this.visAgentInstances.size === 0) {
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
        this.updateScene(this.currentSceneData);
    }

    public unfollow(): void {
        this.setFollowObject(NO_AGENT);
    }

    public setVisibleByIds(hiddenIds: number[]): void {
        this.hiddenIds = hiddenIds;
        this.updateScene(this.currentSceneData);
    }

    public setHighlightByIds(ids: number[]): void {
        this.highlightedIds = ids;
        this.updateScene(this.currentSceneData);
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
        data: PDBModel | MeshLoadRequest | VolumeModel
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
                visAgent.setColor(
                    this.colorHandler.getColorInfoForAgentType(
                        visAgent.agentData.type
                    )
                );
            }
        }

        this.updateScene(this.currentSceneData);
    }

    private setupControls(disableControls: boolean): void {
        this.controls = new OrbitControls(
            this.camera,
            this.threejsrenderer.domElement
        );
        this.controls.addEventListener("change", () => {
            if (this.gui) {
                this.gui.refresh();
            }
        });

        this.controls.zoomSpeed = 1.0;
        this.updateControlsZoomBounds();
        this.setPanningMode(false);
        this.controls.saveState();

        if (disableControls) {
            this.disableControls();
        }
        if (!disableControls) {
            this.threejsrenderer.domElement.onmouseenter = () =>
                this.enableControls();
            this.threejsrenderer.domElement.onmouseleave = () =>
                this.disableControls();
        }
    }

    private updateControlsZoomBounds(): void {
        // Perspective camera limits - based on distance to target
        // Calculate from default orbit radius
        const orbitRadius = this.getDefaultOrbitRadius();
        this.controls.minDistance = orbitRadius / MAX_ZOOM;
        this.controls.maxDistance = orbitRadius / MIN_ZOOM;

        // Orthographic camera limits - based on zoom level
        this.controls.maxZoom = MAX_ZOOM;
        this.controls.minZoom = MIN_ZOOM;
    }

    public resize(width: number, height: number): void {
        // at least 2x2 in size when resizing, to prevent bad buffer sizes
        width = Math.max(width, 2);
        height = Math.max(height, 2);

        this.perspectiveCamera.aspect = width / height;
        this.perspectiveCamera.updateProjectionMatrix();

        this.updateOrthographicFrustum();

        this.threejsrenderer.setSize(width, height);
        this.renderer.resize(width, height);
    }

    public setCameraType(ortho: boolean): void {
        const newCam = ortho ? this.orthographicCamera : this.perspectiveCamera;
        if (newCam === this.camera) {
            return;
        }

        // `OrbitControls` zooms `PerspectiveCamera`s by changing position to dolly
        // relative to the target, and `OrthographicCamera`s by setting zoom and
        // leaving position unchanged (keeping a constant distance to target).

        const defaultOrbitRadius = this.getDefaultOrbitRadius();
        const offset = this.camera.position.clone().sub(this.controls.target);
        const spherical = new Spherical().setFromVector3(offset);
        let zoom = 1;

        if (ortho) {
            // If switching to ortho, reset distance to target and convert it to zoom.
            zoom = defaultOrbitRadius / spherical.radius;
            spherical.radius = defaultOrbitRadius;
        } else {
            // If switching to perspective, convert zoom to new distance to target.
            spherical.radius = defaultOrbitRadius / this.camera.zoom;
        }

        newCam.position.setFromSpherical(spherical).add(this.controls.target);
        newCam.up.copy(this.camera.up);
        newCam.zoom = zoom;

        this.controls.object = newCam;
        this.controls.update();
        this.camera = newCam;
    }

    private createWebGL(): WebGLRenderer {
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

        this.threejsrenderer.setSize(
            CANVAS_INITIAL_WIDTH,
            CANVAS_INITIAL_HEIGHT
        ); // expected to change when reparented
        this.threejsrenderer.setClearColor(this.backgroundColor, 1);
        this.threejsrenderer.clear();

        return this.threejsrenderer;
    }

    public setCanvasOnTheDom(
        parent: HTMLElement | null,
        disableControls: boolean
    ): void {
        if (parent === undefined || parent == null) {
            return;
        }
        if (parent["data-has-simularium-viewer-canvas"]) {
            return;
        }
        this.threejsrenderer = this.createWebGL();
        parent.appendChild(this.threejsrenderer.domElement);
        parent["data-has-simularium-viewer-canvas"] = true;
        this.setupControls(disableControls);

        this.resize(
            Number(parent.dataset.width),
            Number(parent.dataset.height)
        );

        this.threejsrenderer.setClearColor(this.backgroundColor, 1.0);
        this.threejsrenderer.clear();

        this.threejsrenderer.domElement.setAttribute(
            "style",
            "top: 0px; left: 0px"
        );
    }

    public toggleControls(lockedCamera: boolean): void {
        if (lockedCamera) {
            this.disableControls();
        } else {
            this.enableControls();
        }
    }

    public disableControls(): void {
        this.controls.enabled = false;
    }

    public enableControls(): void {
        this.controls.enabled = true;
    }

    private setPdbLods(): void {
        // set lod for pdbs.
        this.geometryStore.forEachPDB((agentGeo) => {
            agentGeo.beginUpdate();
        });

        const agentPos = new Vector3();
        for (let i = 0; i < this.agentsWithPdbsToDraw.length; ++i) {
            const visAgent = this.agentsWithPdbsToDraw[i];
            const agentData = visAgent.agentData;
            // TODO should visAgent hold onto its PDBEntry? would save this second array
            const pdbModel = this.agentPdbsToDraw[i];
            agentPos.set(agentData.x, agentData.y, agentData.z);
            const agentDistance = this.camera.position.distanceTo(agentPos);
            for (let j = 0; j < this.lodDistanceStops.length; ++j) {
                // the first distance less than.
                if (agentDistance < this.lodDistanceStops[j]) {
                    const index = j + this.lodBias;
                    const instancedPdb = pdbModel.getLOD(index);

                    instancedPdb.addInstance(
                        agentData.x,
                        agentData.y,
                        agentData.z,
                        // We do not support scaling of pdb yet.
                        // pdb positions are already in native physical units
                        1.0,
                        agentData.xrot,
                        agentData.yrot,
                        agentData.zrot,
                        visAgent.agentData.instanceId,
                        visAgent.signedTypeId(),
                        // a scale value for LODs
                        0.25 + index * 0.25
                    );
                    break;
                }
            }
        }
        this.geometryStore.forEachPDB((agentGeo) => {
            agentGeo.endUpdate();
        });
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
        // Tight bounds with fudge factor because the bounding box is not really
        // bounding.  Also allow for camera to be inside of box.
        this.camera.near = Math.max(this.boxNearZ * 0.66, CAMERA_INITIAL_ZNEAR);
        this.camera.far = Math.min(this.boxFarZ * 1.33, CAMERA_INITIAL_ZFAR);
        this.camera.updateProjectionMatrix();

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
        for (let i = this.volumeGroup.children.length - 1; i >= 0; i--) {
            this.volumeGroup.remove(this.volumeGroup.children[i]);
        }

        const canvasWidth = this.threejsrenderer.domElement.width;
        const canvasHeight = this.threejsrenderer.domElement.height;

        // re-add fibers immediately
        this.instancedMeshGroup.add(this.fibers.getGroup());

        if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
            // meshes only.
            this.threejsrenderer.render(this.scene, this.camera);
        } else {
            this.setPdbLods();

            this.scene.updateMatrixWorld();
            this.scene.matrixAutoUpdate = false;

            // collect up the meshes that have > 0 instances
            const meshTypes: GeometryInstanceContainer[] = [];
            for (const entry of this.geometryStore.registry.values()) {
                const { displayType } = entry;
                if (displayType === GeometryDisplayType.PDB) {
                    const pdbEntry = entry as PDBGeometry;
                    for (let i = 0; i < pdbEntry.geometry.numLODs(); ++i) {
                        const lod = pdbEntry.geometry.getLOD(i);
                        if (lod.instanceCount() > 0) {
                            meshTypes.push(lod);
                            this.instancedMeshGroup.add(lod.getMesh());
                        }
                    }
                } else if (displayType === GeometryDisplayType.VOLUME) {
                    const volObj = entry.geometry.getObject3D();
                    if (volObj) {
                        const orthoScale = isOrthographicCamera(this.camera)
                            ? this.camera.top / this.camera.zoom
                            : undefined;
                        entry.geometry.setViewportSize(
                            canvasWidth,
                            canvasHeight,
                            orthoScale
                        );
                        entry.geometry.onBeforeRender(
                            this.threejsrenderer,
                            this.camera
                        );
                        this.volumeGroup.add(volObj);
                    }
                } else {
                    const meshEntry = entry as MeshGeometry;
                    if (meshEntry.geometry.instances.instanceCount() > 0) {
                        meshTypes.push(meshEntry.geometry.instances);
                        this.instancedMeshGroup.add(
                            meshEntry.geometry.instances.getMesh()
                        );
                    }
                }
            }

            this.renderer.setMeshGroups(
                this.instancedMeshGroup,
                this.fibers,
                meshTypes
            );
            this.renderer.setFollowedInstance(this.followObjectId);
            //get bounding box max dim
            const v = new Vector3();
            this.boundingBox.getSize(v);
            const maxDim = Math.max(v.x, v.y, v.z);
            // this.camera.zoom accounts for perspective vs ortho cameras
            this.renderer.setNearFar(
                this.boxNearZ,
                this.boxFarZ,
                maxDim,
                this.camera.zoom
            );
            this.boundingBoxMesh.visible = false;
            this.tickMarksMesh.visible = false;
            this.agentPathGroup.visible = false;
            this.volumeGroup.visible = false;
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
            this.volumeGroup.visible = true;

            this.threejsrenderer.autoClear = false;
            // hide everything except the wireframe and paths, and render with the standard renderer
            this.instancedMeshGroup.visible = false;
            this.threejsrenderer.render(this.scene, this.camera);
            this.instancedMeshGroup.visible = true;
            this.threejsrenderer.autoClear = true;

            this.scene.matrixAutoUpdate = true;
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
            const mouse = new Vector2(
                (offsetX / size.x) * 2 - 1,
                -(offsetY / size.y) * 2 + 1
            );
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

    private setAgentColors(): void {
        this.visAgents.forEach((agent) => {
            agent.setColor(
                this.colorHandler.getColorInfoForAgentType(agent.agentData.type)
            );
        });
    }

    public createMaterials(colors: (number | string)[]): void {
        const newColorData = this.colorHandler.updateColorArray(colors);
        this.renderer.updateColors(
            newColorData.numberOfColors,
            newColorData.colorArray
        );
        this.setAgentColors();
    }

    public applyColorToAgents(colorAssignments: ColorAssignment[]): void {
        colorAssignments.forEach((color) => {
            const newColorData = this.colorHandler.setColorForAgentTypes(
                color.agentIds,
                color.color
            );
            this.renderer.updateColors(
                newColorData.numberOfColors,
                newColorData.colorArray
            );
        });
        this.updateScene(this.currentSceneData);
    }

    /**
     *   Data Management
     */
    public resetMapping(): void {
        this.resetAllGeometry();
        this.visGeomMap.clear();
        this.geometryStore.reset();
        this.scaleMapping.clear();
    }

    private getGeoForAgentType(id: number): AgentGeometry | null {
        const entryName = this.visGeomMap.get(id);
        if (!entryName) {
            this.logger.error("not in visGeomMap", id);
            return null; // unreachable, but here for typeScript
        }
        return this.geometryStore.getGeoForAgentType(entryName);
    }

    public handleAgentGeometry(typeMapping: EncodedTypeMapping): void {
        this.clearForNewTrajectory();
        this.setGeometryData(typeMapping);
    }

    private setGeometryData(typeMapping: EncodedTypeMapping): void {
        this.logger.info("Received type mapping data: ", typeMapping);
        Object.keys(typeMapping).forEach(async (id) => {
            const entry: AgentDisplayDataWithGeometry = typeMapping[id];
            const { url, displayType } = entry.geometry;
            const lookupKey = url ? checkAndSanitizePath(url) : displayType;
            // map id --> lookupKey
            this.visGeomMap.set(Number(id), lookupKey);
            // get geom for lookupKey,
            // will only load each geometry once, so may return nothing
            // if the same geometry is assigned to more than one agent
            const newGeometryLoaded = await this.geometryStore.mapKeyToGeom(
                Number(id),
                entry.geometry
            );

            if (!newGeometryLoaded) {
                // no new geometry to load
                return;
            }
            // will only have a returned displayType if it changed.
            const {
                displayType: returnedDisplayType,
                geometry,
                errorMessage,
            } = newGeometryLoaded;
            const newDisplayType = returnedDisplayType || displayType;
            this.onNewRuntimeGeometryType(lookupKey, newDisplayType, geometry);
            // handle additional async update to LOD for pdbs
            if (newDisplayType === GeometryDisplayType.PDB && geometry) {
                const pdbModel = geometry as PDBModel;
                await pdbModel.generateLOD();
                this.logger.info("Finished loading pdb LODs: ", lookupKey);
                this.onNewRuntimeGeometryType(
                    lookupKey,
                    newDisplayType,
                    geometry
                );
            }
            // if returned with a resolve, but has an error message,
            // the error was handled, and the geometry was replaced with a sphere
            // but still good to tell the user about it.
            if (errorMessage) {
                this.onError(
                    new FrontEndError(errorMessage, ErrorLevel.WARNING)
                );
                this.logger.info(errorMessage);
            }
        });
        this.updateScene(this.currentSceneData);
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
            this.logger.warn(
                `Invalid volume dimensions received: ${volumeDimensions}; using defaults.`
            );
            volumeDimensions = DEFAULT_VOLUME_DIMENSIONS;
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

    private addPdbToDrawList(
        typeId: number,
        visAgent: VisAgent,
        pdbEntry: PDBModel
    ) {
        if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
            this.legacyRenderer.addPdb(
                pdbEntry,
                visAgent,
                this.colorHandler.getColorInfoForAgentType(typeId).color,
                this.lodDistanceStops
            );
        } else {
            // if the pdb doesn't have any lods yet then we can't draw with it.
            if (pdbEntry && pdbEntry.numLODs() > 0) {
                // add to render list
                // then at render time, select LOD based on camera
                this.agentsWithPdbsToDraw.push(visAgent);
                this.agentPdbsToDraw.push(pdbEntry);
            }
        }
    }

    private addMeshToDrawList(
        typeId: number,
        visAgent: VisAgent,
        meshEntry: MeshLoadRequest,
        agentData: AgentData
    ) {
        const radius = agentData.cr ? agentData.cr : 1;
        const scale = this.getScaleForId(typeId);
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
                this.colorHandler.getColorInfoForAgentType(typeId).color
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
                    visAgent.signedTypeId(),
                    1,
                    agentData.subpoints
                );
            }
        }
    }

    private addFiberToDrawList(
        typeId: number,
        visAgent: VisAgent,
        agentData: AgentData
    ) {
        visAgent.updateFiber(agentData.subpoints);
        const scale = this.getScaleForId(typeId);

        if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
            this.legacyRenderer.addFiber(
                visAgent,
                agentData.cr * scale,
                this.colorHandler.getColorInfoForAgentType(typeId).color
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
                agentData.xrot,
                agentData.yrot,
                agentData.zrot,
                visAgent.agentData.instanceId,
                visAgent.signedTypeId()
            );
        }
    }

    /**
     * Updates only volumes in the scene, and returns a promise which resolves
     * when they've all loaded.
     */
    private async updateVolumesOnly(
        view: Float32Array,
        agentCount: number
    ): Promise<void> {
        const volumeLoadPromises: Promise<void>[] = [];
        let offset = AGENT_HEADER_SIZE;
        for (let i = 0; i < agentCount; i++) {
            const agentData = getAgentDataFromBuffer(view, offset);
            const { visType, type } = agentData;
            if (visType === VisTypes.ID_VIS_TYPE_DEFAULT) {
                const response = this.getGeoForAgentType(type);
                if (
                    response &&
                    response.displayType === GeometryDisplayType.VOLUME
                ) {
                    const { geometry } = response;
                    if (geometry) {
                        const prom = geometry.setAgentData(agentData, true);
                        volumeLoadPromises.push(prom);
                    }
                }
            }
            offset = getNextAgentOffset(view, offset);
        }
        await Promise.all(volumeLoadPromises);
    }

    /**
     *   Update Scene
     **/
    private async updateScene(
        frameData: CachedFrame,
        waitForVolumes?: boolean
    ): Promise<void> {
        this.currentSceneData = frameData;
        const view = new Float32Array(frameData.data);
        const agentCount = frameData.agentCount;

        if (waitForVolumes) {
            await this.updateVolumesOnly(view, agentCount);
        }

        // values for updating agent path
        let dx = 0,
            dy = 0,
            dz = 0;
        let lastx = 0,
            lasty = 0,
            lastz = 0;

        this.legacyRenderer.beginUpdate(this.scene);
        this.fibers.beginUpdate();
        this.geometryStore.forEachMesh((agentGeo) => {
            agentGeo.geometry.instances.beginUpdate();
        });

        // Clear draw lists
        this.agentsWithPdbsToDraw = [];
        this.agentPdbsToDraw = [];

        // Mark all agents as inactive and invisible
        for (let i = 0; i < MAX_MESHES && i < this.visAgents.length; i++) {
            this.visAgents[i].hideAndDeactivate();
        }

        let offset = AGENT_HEADER_SIZE;
        const newVisAgentInstances = new Map<number, VisAgent>();
        for (let i = 0; i < agentCount; i++) {
            const agentData = getAgentDataFromBuffer(view, offset);
            const { visType, instanceId, type: typeId } = agentData;

            lastx = agentData.x;
            lasty = agentData.y;
            lastz = agentData.z;

            let visAgent = this.visAgentInstances.get(instanceId);

            const path = this.findPathForAgent(instanceId);
            if (path && visAgent) {
                lastx = visAgent.agentData.x;
                lasty = visAgent.agentData.y;
                lastz = visAgent.agentData.z;
            }

            if (!visAgent) {
                if (this.availableAgentPool.length > 0) {
                    visAgent = this.availableAgentPool.pop() as VisAgent;
                } else {
                    visAgent = this.createAgent();
                }
                visAgent.agentData.instanceId = instanceId;
                this.visAgentInstances.set(instanceId, visAgent);
                visAgent.hidden = true;
            }

            if (visAgent.agentData.instanceId !== instanceId) {
                this.logger.warn(
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
                offset = getNextAgentOffset(view, offset);
                continue;
            }

            visAgent.setColor(
                this.colorHandler.getColorInfoForAgentType(typeId)
            );
            // if not fiber...
            if (visType === VisTypes.ID_VIS_TYPE_DEFAULT) {
                const response = this.getGeoForAgentType(typeId);
                if (!response) {
                    this.logger.warn(
                        `No mesh nor pdb available for ${typeId}? Should be unreachable code`
                    );
                    offset = getNextAgentOffset(view, offset);
                    continue;
                }
                const { geometry, displayType } = response;
                if (geometry && displayType === GeometryDisplayType.PDB) {
                    this.addPdbToDrawList(typeId, visAgent, geometry);
                } else if (displayType === GeometryDisplayType.VOLUME) {
                    if (!waitForVolumes) {
                        geometry.setAgentData(agentData);
                    }
                } else {
                    this.addMeshToDrawList(
                        typeId,
                        visAgent,
                        geometry as MeshLoadRequest,
                        agentData
                    );
                }

                dx = agentData.x - lastx;
                dy = agentData.y - lasty;
                dz = agentData.z - lastz;

                if (path) {
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
                this.addFiberToDrawList(typeId, visAgent, agentData);
            }
            newVisAgentInstances.set(instanceId, visAgent);
            offset = getNextAgentOffset(view, offset);
        }
        for (const [key, visAgent] of this.visAgentInstances) {
            if (!newVisAgentInstances.has(key)) {
                visAgent.resetAgent();
                this.availableAgentPool.push(visAgent);
            }
        }
        this.visAgentInstances = newVisAgentInstances;

        this.fibers.endUpdate();
        this.geometryStore.forEachMesh((agentGeo) => {
            agentGeo.geometry.instances.endUpdate();
        });
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

    public findPathForAgent(id: number): AgentPath | null {
        const path = this.agentPaths.get(id);
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
    ): AgentPath {
        // make sure the idx is not already in our list.
        // could be optimized...
        const foundpath = this.findPathForAgent(id);
        if (foundpath) {
            foundpath.show(true);
            return foundpath;
        }

        if (!maxSegments) {
            maxSegments = MAX_PATH_LEN;
        }

        if (!color) {
            // get the agent's color. is there a simpler way?
            const agent = this.visAgentInstances.get(id);
            if (agent) {
                color = agent.color.clone();
            } else if (this.visAgentInstances.size > 0) {
                console.error("COULD NOT FIND AGENT INSTANCE " + id);
            }
        }

        const pathdata = new AgentPath(color, maxSegments);
        this.agentPathGroup.add(pathdata.line);
        this.agentPaths.set(id, pathdata);
        return pathdata;
    }

    public removePathForAgent(id: number): void {
        if (!this.agentPaths.delete(id)) {
            this.logger.warn(
                "attempted to remove path for agent " +
                    id +
                    " that doesn't exist."
            );
        }
    }

    private removeAllPaths() {
        this.agentPaths.clear();
    }

    public addPointToPath(
        path: AgentPath,
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

        path.addPointToPath(x, y, z, dx, dy, dz, this.pathEndColor);
    }

    public setShowPaths(showPaths: boolean): void {
        this.agentPaths.forEach((path: AgentPath) => {
            path.show(showPaths);
        });
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
            path.show(visible);
        }
    }

    public clearForNewTrajectory(): void {
        this.legacyRenderer.beginUpdate(this.scene);
        this.legacyRenderer.endUpdate(this.scene);
        this.resetMapping();

        // remove current scene agents.
        this.visAgentInstances.clear();
        this.visAgents = [];
        this.currentSceneData = nullCachedFrame();

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
        for (let i = this.instancedMeshGroup.children.length - 1; i >= 0; i--) {
            this.instancedMeshGroup.remove(this.instancedMeshGroup.children[i]);
        }

        // recreate an empty set of fibers to clear out the old ones.
        this.constructInstancedFibers();

        // set all runtime meshes back to spheres.
        for (const visAgent of this.visAgentInstances.values()) {
            visAgent.resetMesh();
        }
    }

    public update(
        agents: CachedFrame,
        waitForVolumes?: boolean
    ): Promise<void> {
        return this.updateScene(agents, waitForVolumes);
    }
}

export { VisGeometry, NO_AGENT };
export default VisGeometry;
