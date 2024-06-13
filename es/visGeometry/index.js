import _slicedToArray from "@babel/runtime/helpers/slicedToArray";
import _toConsumableArray from "@babel/runtime/helpers/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
import WEBGL from "three/examples/jsm/capabilities/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Box3, Box3Helper, BufferAttribute, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, LineBasicMaterial, LineSegments, MOUSE, OrthographicCamera, PerspectiveCamera, Quaternion, Scene, Spherical, Vector2, Vector3, WebGLRenderer } from "three";
import { Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import jsLogger from "js-logger";
import { cloneDeep, noop } from "lodash";
import VisAgent from "./VisAgent";
import VisTypes from "../simularium/VisTypes";
import AgentPath from "./agentPath";
import { FrontEndError, ErrorLevel } from "../simularium/FrontEndError";
import { DEFAULT_CAMERA_Z_POSITION, DEFAULT_CAMERA_SPEC, nullAgent } from "../constants";
import SimulariumRenderer from "./rendering/SimulariumRenderer";
import { InstancedFiberGroup } from "./rendering/InstancedFiber";
import { LegacyRenderer } from "./rendering/LegacyRenderer";
import GeometryStore from "./GeometryStore";
import { GeometryDisplayType } from "./types";
import { checkAndSanitizePath } from "../util";
import ColorHandler from "./ColorHandler";
var MAX_PATH_LEN = 32;
var MAX_MESHES = 100000;
var DEFAULT_BACKGROUND_COLOR = new Color(0, 0, 0);
var DEFAULT_VOLUME_DIMENSIONS = [300, 300, 300];
// tick interval length = length of the longest bounding box edge / NUM_TICK_INTERVALS
var NUM_TICK_INTERVALS = 10;
// tick mark length = 2 * (length of the longest bounding box edge / TICK_LENGTH_FACTOR)
var TICK_LENGTH_FACTOR = 100;
var BOUNDING_BOX_COLOR = new Color(0x6e6e6e);
var NO_AGENT = -1;
var CAMERA_DOLLY_STEP_SIZE = 10;
var CAMERA_INITIAL_ZNEAR = 1.0;
var CAMERA_INITIAL_ZFAR = 1000.0;
var MAX_ZOOM = 120;
var MIN_ZOOM = 0.16;
var CANVAS_INITIAL_WIDTH = 100;
var CANVAS_INITIAL_HEIGHT = 100;
export var RenderStyle = /*#__PURE__*/function (RenderStyle) {
  RenderStyle[RenderStyle["WEBGL1_FALLBACK"] = 0] = "WEBGL1_FALLBACK";
  RenderStyle[RenderStyle["WEBGL2_PREFERRED"] = 1] = "WEBGL2_PREFERRED";
  return RenderStyle;
}({});
function removeByName(group, name) {
  var childrenToRemove = [];
  group.traverse(function (child) {
    if (child.name == name) {
      childrenToRemove.push(child);
    }
  });
  childrenToRemove.forEach(function (child) {
    return group.remove(child);
  });
}
var coordsToVector = function coordsToVector(_ref) {
  var x = _ref.x,
    y = _ref.y,
    z = _ref.z;
  return new Vector3(x, y, z);
};
var VisGeometry = /*#__PURE__*/function () {
  function VisGeometry(loggerLevel) {
    _classCallCheck(this, VisGeometry);
    _defineProperty(this, "onError", void 0);
    _defineProperty(this, "renderStyle", void 0);
    _defineProperty(this, "backgroundColor", void 0);
    _defineProperty(this, "pathEndColor", void 0);
    // maps agent type id to agent geometry name
    _defineProperty(this, "visGeomMap", void 0);
    _defineProperty(this, "geometryStore", void 0);
    _defineProperty(this, "scaleMapping", void 0);
    _defineProperty(this, "followObjectId", void 0);
    _defineProperty(this, "visAgents", void 0);
    _defineProperty(this, "visAgentInstances", void 0);
    _defineProperty(this, "fixLightsToCamera", void 0);
    _defineProperty(this, "highlightedIds", void 0);
    _defineProperty(this, "hiddenIds", void 0);
    _defineProperty(this, "agentPaths", void 0);
    _defineProperty(this, "mlogger", void 0);
    // this is the threejs object that issues all the webgl calls
    _defineProperty(this, "threejsrenderer", void 0);
    _defineProperty(this, "scene", void 0);
    _defineProperty(this, "perspectiveCamera", void 0);
    _defineProperty(this, "orthographicCamera", void 0);
    _defineProperty(this, "camera", void 0);
    _defineProperty(this, "controls", void 0);
    _defineProperty(this, "dl", void 0);
    _defineProperty(this, "hemiLight", void 0);
    _defineProperty(this, "boundingBox", void 0);
    _defineProperty(this, "boundingBoxMesh", void 0);
    _defineProperty(this, "tickMarksMesh", void 0);
    _defineProperty(this, "tickIntervalLength", void 0);
    // front and back of transformed bounds in camera space
    _defineProperty(this, "boxNearZ", void 0);
    _defineProperty(this, "boxFarZ", void 0);
    _defineProperty(this, "colorHandler", void 0);
    _defineProperty(this, "renderer", void 0);
    _defineProperty(this, "legacyRenderer", void 0);
    _defineProperty(this, "currentSceneAgents", void 0);
    _defineProperty(this, "colorsData", void 0);
    _defineProperty(this, "lightsGroup", void 0);
    _defineProperty(this, "agentPathGroup", void 0);
    _defineProperty(this, "instancedMeshGroup", void 0);
    _defineProperty(this, "supportsWebGL2Rendering", void 0);
    _defineProperty(this, "lodBias", void 0);
    _defineProperty(this, "lodDistanceStops", void 0);
    _defineProperty(this, "needToCenterCamera", void 0);
    _defineProperty(this, "needToReOrientCamera", void 0);
    _defineProperty(this, "rotateDistance", void 0);
    _defineProperty(this, "initCameraPosition", void 0);
    _defineProperty(this, "cameraDefault", void 0);
    _defineProperty(this, "fibers", void 0);
    _defineProperty(this, "focusMode", void 0);
    _defineProperty(this, "gui", void 0);
    _defineProperty(this, "cam1", void 0);
    _defineProperty(this, "cam2", void 0);
    _defineProperty(this, "cam3", void 0);
    // Scene update will populate these lists of visible pdb agents.
    // These lists are iterated at render time to detemine LOD.
    // This is because camera updates happen at a different frequency than scene updates.
    _defineProperty(this, "agentsWithPdbsToDraw", void 0);
    _defineProperty(this, "agentPdbsToDraw", void 0);
    this.cam1 = cloneDeep(DEFAULT_CAMERA_SPEC);
    this.cam2 = cloneDeep(DEFAULT_CAMERA_SPEC);
    this.cam3 = cloneDeep(DEFAULT_CAMERA_SPEC);
    this.renderStyle = RenderStyle.WEBGL1_FALLBACK;
    this.supportsWebGL2Rendering = false;
    this.visGeomMap = new Map();
    this.geometryStore = new GeometryStore(loggerLevel);
    this.scaleMapping = new Map();
    this.followObjectId = NO_AGENT;
    this.visAgents = [];
    this.visAgentInstances = new Map();
    this.fixLightsToCamera = true;
    this.highlightedIds = [];
    this.hiddenIds = [];
    this.needToCenterCamera = false;
    this.needToReOrientCamera = false;
    this.rotateDistance = DEFAULT_CAMERA_Z_POSITION;
    // will store data for all agents that are drawing paths
    this.agentPaths = new Map();
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
    var aspect = CANVAS_INITIAL_WIDTH / CANVAS_INITIAL_HEIGHT;
    this.perspectiveCamera = new PerspectiveCamera(75, aspect, CAMERA_INITIAL_ZNEAR, CAMERA_INITIAL_ZFAR);
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
    this.currentSceneAgents = [];
    this.colorsData = new Float32Array(0);
    this.lodBias = 0;
    this.lodDistanceStops = [100, 200, 400, Number.MAX_VALUE];
    this.agentsWithPdbsToDraw = [];
    this.agentPdbsToDraw = [];
    this.onError = noop;
  }
  _createClass(VisGeometry, [{
    key: "setOnErrorCallBack",
    value: function setOnErrorCallBack(onError) {
      this.onError = onError;
    }
  }, {
    key: "setBackgroundColor",
    value: function setBackgroundColor(c) {
      if (c === undefined) {
        this.backgroundColor = DEFAULT_BACKGROUND_COLOR.clone();
      } else {
        // convert from a PropColor to a THREE.Color
        this.backgroundColor = Array.isArray(c) ? new Color(c[0], c[1], c[2]) : new Color(c);
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
  }, {
    key: "getDefaultOrbitRadius",
    value: function getDefaultOrbitRadius() {
      var _this$cameraDefault = this.cameraDefault,
        position = _this$cameraDefault.position,
        lookAtPosition = _this$cameraDefault.lookAtPosition;
      var radius = coordsToVector(position).distanceTo(coordsToVector(lookAtPosition));
      if (this.cameraDefault.orthographic) {
        return radius / this.cameraDefault.zoom;
      }
      return radius;
    }

    /** Set frustum of `orthographicCamera` from fov/aspect of `perspectiveCamera */
  }, {
    key: "updateOrthographicFrustum",
    value: function updateOrthographicFrustum() {
      var _this$perspectiveCame = this.perspectiveCamera,
        fov = _this$perspectiveCame.fov,
        aspect = _this$perspectiveCame.aspect;
      var halfFovRadians = fov * Math.PI / 360;

      // Distant objects are smaller in perspective but the same size in ortho.
      // Find default distance to target and set the frustum size to keep objects
      // at that distance the same size in both cameras.
      var orbitRadius = this.getDefaultOrbitRadius();
      var vSize = Math.tan(halfFovRadians) * orbitRadius;
      var hSize = vSize * aspect;
      this.orthographicCamera.left = -hSize;
      this.orthographicCamera.right = hSize;
      this.orthographicCamera.top = vSize;
      this.orthographicCamera.bottom = -vSize;
      this.orthographicCamera.updateProjectionMatrix();
    }
  }, {
    key: "loadCamera",
    value: function loadCamera(cameraSpec) {
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
  }, {
    key: "storeCamera",
    value: function storeCamera(cameraSpec) {
      var spec = cameraSpec || _objectSpread(_objectSpread({}, cloneDeep(DEFAULT_CAMERA_SPEC)), {}, {
        orthographic: false
      });
      spec.position = this.camera.position.clone();
      spec.upVector = this.camera.up.clone();
      spec.lookAtPosition = this.controls.target.clone();
      spec.fovDegrees = this.perspectiveCamera.fov;
      spec.orthographic = !!this.camera.isOrthographicCamera;
      if (spec.orthographic) {
        spec.zoom = this.orthographicCamera.zoom;
      }
      return spec;
    }
  }, {
    key: "setupGui",
    value: function setupGui(container) {
      var _this = this;
      this.gui = new Pane({
        title: "Advanced Settings",
        container: container
      });
      this.gui.registerPlugin(EssentialsPlugin);
      var fcam = this.gui.addFolder({
        title: "Camera"
      });
      // proxy breaks through reference, so we don't just bind persp/ortho camera
      var cameraProxy = new Proxy(this.camera, {
        get: function get(_, p) {
          return _this.camera[p];
        }
      });
      fcam.addInput(cameraProxy, "position");
      fcam.addInput(this.controls, "target");
      var fovInput = fcam.addInput(this.perspectiveCamera, "fov");
      fovInput.on("change", function () {
        return _this.updateOrthographicFrustum();
      });
      [{
        camera: this.cam1,
        label: "Cam 1"
      }, {
        camera: this.cam2,
        label: "Cam 2"
      }, {
        camera: this.cam3,
        label: "Cam 3"
      }].forEach(function (_ref2) {
        var _this$gui;
        var camera = _ref2.camera,
          label = _ref2.label;
        var grid = (_this$gui = _this.gui) === null || _this$gui === void 0 ? void 0 : _this$gui.addBlade({
          view: "buttongrid",
          size: [2, 1],
          cells: function cells(x, y) {
            return {
              title: [["Activate", "Save"]][y][x]
            };
          },
          label: label
        });
        grid.on("click", function (ev) {
          if (ev.index[0] === 0) {
            _this.loadCamera(camera);
          } else if (ev.index[0] === 1) {
            _this.storeCamera(camera);
          }
        });
      });
      this.gui.addButton({
        title: "Export Cam"
      }).on("click", function () {
        var cam = _this.storeCamera();
        var anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(new Blob([JSON.stringify(cam, null, 2)], {
          type: "text/plain"
        }));
        anchor.download = "camera.json";
        anchor.click();
      });
      this.gui.addButton({
        title: "Import Cam"
      }).on("click", function () {
        var fileinput = document.createElement("input");
        fileinput.type = "file";
        fileinput.style.display = "none";
        fileinput.addEventListener("change", function (e) {
          var reader = new FileReader();
          reader.onload = function (event) {
            var _event$target;
            var cam = JSON.parse(event === null || event === void 0 || (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.result);
            _this.loadCamera(cam);
          };
          var files = e.target.files;
          if (files !== null) {
            reader.readAsText(files[0]);
          }
        });
        fileinput.click();
      });
      var settings = {
        lodBias: this.lodBias,
        lod0: this.lodDistanceStops[0],
        lod1: this.lodDistanceStops[1],
        lod2: this.lodDistanceStops[2],
        bgcolor: {
          r: this.backgroundColor.r * 255,
          g: this.backgroundColor.g * 255,
          b: this.backgroundColor.b * 255
        }
      };
      this.gui.addInput(settings, "bgcolor").on("change", function (event) {
        _this.setBackgroundColor([event.value.r / 255.0, event.value.g / 255.0, event.value.b / 255.0]);
      });
      this.gui.addButton({
        title: "Capture Frame"
      }).on("click", function () {
        _this.render(0);
        var dataUrl = _this.threejsrenderer.domElement.toDataURL("image/png");
        var anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = "screenshot.png";
        anchor.click();
        anchor.remove();
      });
      this.gui.addSeparator();
      var lodFolder = this.gui.addFolder({
        title: "LoD",
        expanded: false
      });
      lodFolder.addInput(settings, "lodBias", {
        min: 0,
        max: 4,
        step: 1
      }).on("change", function (event) {
        _this.lodBias = event.value;
        _this.updateScene(_this.currentSceneAgents);
      });
      lodFolder.addInput(settings, "lod0").on("change", function (event) {
        _this.lodDistanceStops[0] = event.value;
        _this.updateScene(_this.currentSceneAgents);
      });
      lodFolder.addInput(settings, "lod1").on("change", function (event) {
        _this.lodDistanceStops[1] = event.value;
        _this.updateScene(_this.currentSceneAgents);
      });
      lodFolder.addInput(settings, "lod2").on("change", function (event) {
        _this.lodDistanceStops[2] = event.value;
        _this.updateScene(_this.currentSceneAgents);
      });
      this.renderer.setupGui(this.gui);
    }
  }, {
    key: "destroyGui",
    value: function destroyGui() {
      if (this.gui) {
        this.gui.hidden = true;
        this.gui.dispose();
        this.gui = undefined;
      }
    }
  }, {
    key: "setRenderStyle",
    value: function setRenderStyle(renderStyle) {
      // if target render style is supported, then change, otherwise don't.
      if (renderStyle === RenderStyle.WEBGL2_PREFERRED && !this.supportsWebGL2Rendering) {
        this.logger.warn("Warning: WebGL2 rendering not supported");
        return;
      }
      var changed = this.renderStyle !== renderStyle;
      this.renderStyle = renderStyle;
      if (changed) {
        this.constructInstancedFibers();
      }
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "constructInstancedFibers",
    value: function constructInstancedFibers() {
      this.fibers.clear();
      removeByName(this.instancedMeshGroup, InstancedFiberGroup.GROUP_NAME);

      // tell instanced geometry what representation to use.
      if (this.renderStyle === RenderStyle.WEBGL2_PREFERRED) {
        this.fibers = new InstancedFiberGroup();
      }
      this.instancedMeshGroup.add(this.fibers.getGroup());
    }
  }, {
    key: "logger",
    get: function get() {
      return this.mlogger;
    }
  }, {
    key: "renderDom",
    get: function get() {
      return this.threejsrenderer.domElement;
    }
  }, {
    key: "handleCameraData",
    value: function handleCameraData(cameraDefault) {
      // Get default camera transform values from data
      if (cameraDefault) {
        this.cameraDefault = _objectSpread(_objectSpread({}, cameraDefault), {}, {
          orthographic: false
        });
        this.updateOrthographicFrustum();
        this.updateControlsZoomBounds();
      } else {
        this.logger.info("Using default camera settings since none were provided");
        this.cameraDefault = cloneDeep(DEFAULT_CAMERA_SPEC);
      }
      this.resetCamera();
    }

    // Called when a new file is loaded, the Clear button is clicked, or Reset Camera button is clicked
  }, {
    key: "resetCamera",
    value: function resetCamera() {
      this.followObjectId = NO_AGENT;
      this.controls.reset();
      this.resetCameraPosition();
    }

    // Sets camera position and orientation to the trajectory's initial (default) values
  }, {
    key: "resetCameraPosition",
    value: function resetCameraPosition() {
      var _this$cameraDefault2 = this.cameraDefault,
        position = _this$cameraDefault2.position,
        upVector = _this$cameraDefault2.upVector,
        lookAtPosition = _this$cameraDefault2.lookAtPosition,
        fovDegrees = _this$cameraDefault2.fovDegrees;

      // Reset camera position
      this.camera.position.set(position.x, position.y, position.z);
      this.initCameraPosition = this.camera.position.clone();

      // Reset up vector (needs to be a unit vector)
      var normalizedUpVector = coordsToVector(upVector).normalize();
      this.camera.up.copy(normalizedUpVector);

      // Reset lookat position
      var lookAtVector = coordsToVector(lookAtPosition);
      this.camera.lookAt(lookAtVector);
      this.controls.target.copy(lookAtVector);

      // Set fov (perspective) and frustum size (orthographic)
      this.perspectiveCamera.fov = fovDegrees;
      this.perspectiveCamera.updateProjectionMatrix();
      this.updateOrthographicFrustum();
    }
  }, {
    key: "centerCamera",
    value: function centerCamera() {
      this.followObjectId = NO_AGENT;
      this.needToCenterCamera = true;
    }
  }, {
    key: "reOrientCamera",
    value: function reOrientCamera() {
      this.followObjectId = NO_AGENT;
      this.needToReOrientCamera = true;
      this.rotateDistance = this.camera.position.distanceTo(new Vector3());
    }
  }, {
    key: "dolly",
    value: function dolly(changeBy) {
      // TODO should we use the dolly method on OrbitControls here?
      var _this$controls = this.controls,
        minDistance = _this$controls.minDistance,
        maxDistance = _this$controls.maxDistance;
      if (this.camera.isOrthographicCamera) {
        // Orthographic camera: dolly using zoom
        var defaultRadius = this.getDefaultOrbitRadius();
        var newDistance = defaultRadius / this.camera.zoom + changeBy;
        if (newDistance <= minDistance || newDistance >= maxDistance) {
          return;
        }
        this.camera.zoom = defaultRadius / newDistance;
      } else {
        // Perspective camera: actually change position
        var position = this.camera.position.clone();
        var target = this.controls.target.clone();
        var distance = position.distanceTo(target);
        var _newDistance = distance + changeBy;
        if (_newDistance <= minDistance || _newDistance >= maxDistance) {
          return;
        }
        var newPosition = new Vector3().subVectors(position, target).setLength(_newDistance);
        this.camera.position.copy(new Vector3().addVectors(newPosition, target));
      }
      this.controls.update();
    }
  }, {
    key: "zoomIn",
    value: function zoomIn() {
      var changeBy = -CAMERA_DOLLY_STEP_SIZE;
      this.dolly(changeBy);
    }
  }, {
    key: "zoomOut",
    value: function zoomOut() {
      var changeBy = CAMERA_DOLLY_STEP_SIZE;
      this.dolly(changeBy);
    }
  }, {
    key: "setPanningMode",
    value: function setPanningMode(pan) {
      if (!pan) {
        this.controls.enablePan = true;
        this.controls.enableRotate = true;
        this.controls.mouseButtons = {
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN
        };
      } else {
        this.controls.enablePan = true;
        this.controls.enableRotate = true;
        this.controls.mouseButtons = {
          LEFT: MOUSE.PAN,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.ROTATE
        };
      }
    }
  }, {
    key: "setAllowViewPanning",
    value: function setAllowViewPanning(allow) {
      this.controls.enablePan = allow;
    }
  }, {
    key: "setFocusMode",
    value: function setFocusMode(focus) {
      this.focusMode = focus;
    }
  }, {
    key: "getObjectData",
    value: function getObjectData(id) {
      var data = this.visAgentInstances.get(id);
      if (!data) {
        return nullAgent();
      }
      return data.agentData;
    }
  }, {
    key: "getFollowObject",
    value: function getFollowObject() {
      return this.followObjectId;
    }
  }, {
    key: "setFollowObject",
    value: function setFollowObject(obj) {
      if (this.visAgentInstances.size === 0) {
        return;
      }
      if (this.followObjectId !== NO_AGENT) {
        var visAgent = this.visAgentInstances.get(this.followObjectId);
        if (!visAgent) {
          console.error("NO AGENT FOR INSTANCE " + this.followObjectId);
        } else {
          visAgent.setFollowed(false);
        }
      }
      this.followObjectId = obj;
      if (obj !== NO_AGENT) {
        var _visAgent = this.visAgentInstances.get(obj);
        if (!_visAgent) {
          console.error("NO AGENT FOR INSTANCE " + this.followObjectId);
        } else {
          _visAgent.setFollowed(true);
        }
      }
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "unfollow",
    value: function unfollow() {
      this.setFollowObject(NO_AGENT);
    }
  }, {
    key: "setVisibleByIds",
    value: function setVisibleByIds(hiddenIds) {
      this.hiddenIds = hiddenIds;
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "setHighlightByIds",
    value: function setHighlightByIds(ids) {
      this.highlightedIds = ids;
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "dehighlight",
    value: function dehighlight() {
      this.setHighlightByIds([]);
    }
  }, {
    key: "getAllTypeIdsForGeometryName",
    value: function getAllTypeIdsForGeometryName(name) {
      return _toConsumableArray(this.visGeomMap.entries()).filter(function (_ref3) {
        var v = _ref3[1];
        return v === name;
      }).map(function (_ref4) {
        var _ref5 = _slicedToArray(_ref4, 1),
          k = _ref5[0];
        return k;
      });
    }
  }, {
    key: "onNewRuntimeGeometryType",
    value: function onNewRuntimeGeometryType(geoName, displayType, data) {
      // find all typeIds for this meshName
      var typeIds = this.getAllTypeIdsForGeometryName(geoName);

      // assuming the meshLoadRequest has already been added to the registry
      if (data === undefined) {
        console.error("Mesh name ".concat(geoName, " not found in mesh registry"));
        return;
      }

      // go over all objects and update mesh of this typeId
      // if this happens before the first updateScene, then the visAgents don't have type id's yet.
      var nMeshes = this.visAgents.length;
      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var visAgent = this.visAgents[i];
        if (typeIds.includes(visAgent.agentData.type)) {
          visAgent.setColor(this.colorHandler.getColorInfoForAgentType(visAgent.agentData.type));
        }
      }
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "setupControls",
    value: function setupControls(disableControls) {
      var _this2 = this;
      this.controls = new OrbitControls(this.camera, this.threejsrenderer.domElement);
      this.controls.addEventListener("change", function () {
        if (_this2.gui) {
          _this2.gui.refresh();
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
        this.threejsrenderer.domElement.onmouseenter = function () {
          return _this2.enableControls();
        };
        this.threejsrenderer.domElement.onmouseleave = function () {
          return _this2.disableControls();
        };
      }
    }
  }, {
    key: "updateControlsZoomBounds",
    value: function updateControlsZoomBounds() {
      // Perspective camera limits - based on distance to target
      // Calculate from default orbit radius
      var orbitRadius = this.getDefaultOrbitRadius();
      this.controls.minDistance = orbitRadius / MAX_ZOOM;
      this.controls.maxDistance = orbitRadius / MIN_ZOOM;

      // Orthographic camera limits - based on zoom level
      this.controls.maxZoom = MAX_ZOOM;
      this.controls.minZoom = MIN_ZOOM;
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      // at least 2x2 in size when resizing, to prevent bad buffer sizes
      width = Math.max(width, 2);
      height = Math.max(height, 2);
      this.perspectiveCamera.aspect = width / height;
      this.perspectiveCamera.updateProjectionMatrix();
      this.updateOrthographicFrustum();
      this.threejsrenderer.setSize(width, height);
      this.renderer.resize(width, height);
    }
  }, {
    key: "setCameraType",
    value: function setCameraType(ortho) {
      var newCam = ortho ? this.orthographicCamera : this.perspectiveCamera;
      if (newCam === this.camera) {
        return;
      }

      // `OrbitControls` zooms `PerspectiveCamera`s by changing position to dolly
      // relative to the target, and `OrthographicCamera`s by setting zoom and
      // leaving position unchanged (keeping a constant distance to target).

      var defaultOrbitRadius = this.getDefaultOrbitRadius();
      var offset = this.camera.position.clone().sub(this.controls.target);
      var spherical = new Spherical().setFromVector3(offset);
      var zoom = 1;
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
  }, {
    key: "createWebGL",
    value: function createWebGL() {
      if (WEBGL.isWebGL2Available() === false) {
        this.renderStyle = RenderStyle.WEBGL1_FALLBACK;
        this.supportsWebGL2Rendering = false;
        this.threejsrenderer = new WebGLRenderer({
          premultipliedAlpha: false
        });
      } else {
        this.renderStyle = RenderStyle.WEBGL2_PREFERRED;
        this.supportsWebGL2Rendering = true;
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("webgl2", {
          alpha: false
        });
        var rendererParams = {
          canvas: canvas,
          context: context,
          premultipliedAlpha: false
        };
        this.threejsrenderer = new WebGLRenderer(rendererParams);
      }

      // set this up after the renderStyle has been set.
      this.constructInstancedFibers();
      this.threejsrenderer.setSize(CANVAS_INITIAL_WIDTH, CANVAS_INITIAL_HEIGHT); // expected to change when reparented
      this.threejsrenderer.setClearColor(this.backgroundColor, 1);
      this.threejsrenderer.clear();
      return this.threejsrenderer;
    }
  }, {
    key: "setCanvasOnTheDom",
    value: function setCanvasOnTheDom(parent, disableControls) {
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
      this.resize(Number(parent.dataset.width), Number(parent.dataset.height));
      this.threejsrenderer.setClearColor(this.backgroundColor, 1.0);
      this.threejsrenderer.clear();
      this.threejsrenderer.domElement.setAttribute("style", "top: 0px; left: 0px");
    }
  }, {
    key: "toggleControls",
    value: function toggleControls(lockedCamera) {
      if (lockedCamera) {
        this.disableControls();
      } else {
        this.enableControls();
      }
    }
  }, {
    key: "disableControls",
    value: function disableControls() {
      this.controls.enabled = false;
    }
  }, {
    key: "enableControls",
    value: function enableControls() {
      this.controls.enabled = true;
    }
  }, {
    key: "setPdbLods",
    value: function setPdbLods() {
      // set lod for pdbs.
      this.geometryStore.forEachPDB(function (agentGeo) {
        agentGeo.beginUpdate();
      });
      var agentPos = new Vector3();
      for (var i = 0; i < this.agentsWithPdbsToDraw.length; ++i) {
        var visAgent = this.agentsWithPdbsToDraw[i];
        var agentData = visAgent.agentData;
        // TODO should visAgent hold onto its PDBEntry? would save this second array
        var pdbModel = this.agentPdbsToDraw[i];
        agentPos.set(agentData.x, agentData.y, agentData.z);
        var agentDistance = this.camera.position.distanceTo(agentPos);
        for (var j = 0; j < this.lodDistanceStops.length; ++j) {
          // the first distance less than.
          if (agentDistance < this.lodDistanceStops[j]) {
            var index = j + this.lodBias;
            var instancedPdb = pdbModel.getLOD(index);
            instancedPdb.addInstance(agentData.x, agentData.y, agentData.z,
            // We do not support scaling of pdb yet.
            // pdb positions are already in native physical units
            1.0, agentData.xrot, agentData.yrot, agentData.zrot, visAgent.agentData.instanceId, visAgent.signedTypeId(),
            // a scale value for LODs
            0.25 + index * 0.25);
            break;
          }
        }
      }
      this.geometryStore.forEachPDB(function (agentGeo) {
        agentGeo.endUpdate();
      });
    }
  }, {
    key: "render",
    value: function render(_time) {
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
        this.hemiLight.position.setFromMatrixColumn(this.camera.matrixWorld, 1);
      }

      // remove all children of instancedMeshGroup.  we will re-add them.
      for (var i = this.instancedMeshGroup.children.length - 1; i >= 0; i--) {
        this.instancedMeshGroup.remove(this.instancedMeshGroup.children[i]);
      }

      // re-add fibers immediately
      this.instancedMeshGroup.add(this.fibers.getGroup());
      if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
        // meshes only.
        this.threejsrenderer.render(this.scene, this.camera);
      } else {
        this.setPdbLods();
        this.scene.updateMatrixWorld();
        this.scene.autoUpdate = false;

        // collect up the meshes that have > 0 instances
        var meshTypes = [];
        var _iterator = _createForOfIteratorHelper(this.geometryStore.registry.values()),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var entry = _step.value;
            var displayType = entry.displayType;
            if (displayType !== GeometryDisplayType.PDB) {
              var meshEntry = entry;
              if (meshEntry.geometry.instances.instanceCount() > 0) {
                meshTypes.push(meshEntry.geometry.instances);
                this.instancedMeshGroup.add(meshEntry.geometry.instances.getMesh());
              }
            } else {
              var pdbEntry = entry;
              for (var _i = 0; _i < pdbEntry.geometry.numLODs(); ++_i) {
                var lod = pdbEntry.geometry.getLOD(_i);
                if (lod.instanceCount() > 0) {
                  meshTypes.push(lod);
                  this.instancedMeshGroup.add(lod.getMesh());
                }
              }
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
        this.renderer.setMeshGroups(this.instancedMeshGroup, this.fibers, meshTypes);
        this.renderer.setFollowedInstance(this.followObjectId);
        //get bounding box max dim
        var v = new Vector3();
        this.boundingBox.getSize(v);
        var maxDim = Math.max(v.x, v.y, v.z);
        // this.camera.zoom accounts for perspective vs ortho cameras
        this.renderer.setNearFar(this.boxNearZ, this.boxFarZ, maxDim, this.camera.zoom);
        this.boundingBoxMesh.visible = false;
        this.tickMarksMesh.visible = false;
        this.agentPathGroup.visible = false;
        this.renderer.render(this.threejsrenderer, this.scene, this.camera, null);

        // final pass, add extra stuff on top: bounding box and line paths
        this.boundingBoxMesh.visible = true;
        this.tickMarksMesh.visible = true;
        this.agentPathGroup.visible = true;
        this.threejsrenderer.autoClear = false;
        // hide everything except the wireframe and paths, and render with the standard renderer
        this.instancedMeshGroup.visible = false;
        this.threejsrenderer.render(this.scene, this.camera);
        this.instancedMeshGroup.visible = true;
        this.threejsrenderer.autoClear = true;
        this.scene.autoUpdate = true;
      }
    }
  }, {
    key: "transformBoundingBox",
    value: function transformBoundingBox() {
      // bounds are in world space
      var box = new Box3().copy(this.boundingBox);
      // world to camera space
      box.applyMatrix4(this.camera.matrixWorldInverse);
      // camera is pointing along negative Z.  so invert for positive distances
      this.boxNearZ = -box.max.z;
      this.boxFarZ = -box.min.z;
      // compare with CompositePass float eyeDepth = -col0.z; to use a positive distance value.
    }
  }, {
    key: "hitTest",
    value: function hitTest(offsetX, offsetY) {
      var size = new Vector2();
      this.threejsrenderer.getSize(size);
      if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
        var mouse = new Vector2(offsetX / size.x * 2 - 1, -(offsetY / size.y) * 2 + 1);
        return this.legacyRenderer.hitTest(mouse, this.camera);
      } else {
        // read from instance buffer pixel!
        return this.renderer.hitTest(this.threejsrenderer, offsetX, size.y - offsetY);
      }
    }
  }, {
    key: "setAgentColors",
    value: function setAgentColors() {
      var _this3 = this;
      this.visAgents.forEach(function (agent) {
        agent.setColor(_this3.colorHandler.getColorInfoForAgentType(agent.agentData.type));
      });
    }
  }, {
    key: "createMaterials",
    value: function createMaterials(colors) {
      var newColorData = this.colorHandler.updateColorArray(colors);
      this.renderer.updateColors(newColorData.numberOfColors, newColorData.colorArray);
      this.setAgentColors();
    }
  }, {
    key: "applyColorToAgents",
    value: function applyColorToAgents(agentIds, color) {
      var newColorData = this.colorHandler.setColorForAgentTypes(agentIds, color);
      this.renderer.updateColors(newColorData.numberOfColors, newColorData.colorArray);
      this.updateScene(this.currentSceneAgents);
    }

    /**
     *   Data Management
     */
  }, {
    key: "resetMapping",
    value: function resetMapping() {
      this.resetAllGeometry();
      this.visGeomMap.clear();
      this.geometryStore.reset();
      this.scaleMapping.clear();
    }
  }, {
    key: "getGeoForAgentType",
    value: function getGeoForAgentType(id) {
      var entryName = this.visGeomMap.get(id);
      if (!entryName) {
        this.logger.error("not in visGeomMap", id);
        return null; // unreachable, but here for typeScript
      }
      return this.geometryStore.getGeoForAgentType(entryName);
    }
  }, {
    key: "handleAgentGeometry",
    value: function handleAgentGeometry(typeMapping) {
      this.clearForNewTrajectory();
      this.setGeometryData(typeMapping);
    }
  }, {
    key: "setGeometryData",
    value: function setGeometryData(typeMapping) {
      var _this4 = this;
      this.logger.info("Received type mapping data: ", typeMapping);
      Object.keys(typeMapping).forEach(function (id) {
        var entry = typeMapping[id];
        var _entry$geometry = entry.geometry,
          url = _entry$geometry.url,
          displayType = _entry$geometry.displayType;
        var lookupKey = url ? checkAndSanitizePath(url) : displayType;
        // map id --> lookupKey
        _this4.visGeomMap.set(Number(id), lookupKey);
        // get geom for lookupKey,
        // will only load each geometry once, so may return nothing
        // if the same geometry is assigned to more than one agent
        _this4.geometryStore.mapKeyToGeom(Number(id), entry.geometry).then(function (newGeometryLoaded) {
          if (!newGeometryLoaded) {
            // no new geometry to load
            return;
          }
          // will only have a returned displayType if it changed.
          var returnedDisplayType = newGeometryLoaded.displayType,
            geometry = newGeometryLoaded.geometry,
            errorMessage = newGeometryLoaded.errorMessage;
          var newDisplayType = returnedDisplayType || displayType;
          _this4.onNewRuntimeGeometryType(lookupKey, newDisplayType, geometry);
          // handle additional async update to LOD for pdbs
          if (newDisplayType === GeometryDisplayType.PDB && geometry) {
            var pdbModel = geometry;
            return pdbModel.generateLOD().then(function () {
              _this4.logger.info("Finished loading pdb LODs: ", lookupKey);
              _this4.onNewRuntimeGeometryType(lookupKey, newDisplayType, geometry);
            });
          }
          // if returned with a resolve, but has an error message,
          // the error was handled, and the geometry was replaced with a sphere
          // but still good to tell the user about it.
          if (errorMessage) {
            _this4.onError(new FrontEndError(errorMessage, ErrorLevel.WARNING));
            _this4.logger.info(errorMessage);
          }
        })["catch"](function (reason) {
          _this4.onError(new FrontEndError(reason));
          _this4.logger.info(reason);
        });
      });
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "setTickIntervalLength",
    value: function setTickIntervalLength(axisLength) {
      var tickIntervalLength = axisLength / NUM_TICK_INTERVALS;
      // TODO: round tickIntervalLength to a nice number
      this.tickIntervalLength = tickIntervalLength;
    }
  }, {
    key: "createTickMarks",
    value: function createTickMarks(volumeDimensions, boundsAsTuple) {
      var _boundsAsTuple = _slicedToArray(boundsAsTuple, 6),
        minX = _boundsAsTuple[0],
        minY = _boundsAsTuple[1],
        minZ = _boundsAsTuple[2],
        maxX = _boundsAsTuple[3],
        maxY = _boundsAsTuple[4],
        maxZ = _boundsAsTuple[5];
      var visible = this.tickMarksMesh ? this.tickMarksMesh.visible : true;
      var longestEdgeLength = Math.max.apply(Math, _toConsumableArray(volumeDimensions));
      // Use the length of the longest bounding box edge to determine the tick interval (scale bar) length
      this.setTickIntervalLength(longestEdgeLength);
      // The size of tick marks also depends on the length of the longest bounding box edge
      var tickHalfLength = longestEdgeLength / TICK_LENGTH_FACTOR;
      var lineGeometry = new BufferGeometry();
      var verticesArray = [];

      // Add tick mark vertices for the 4 bounding box edges parallel to the x-axis
      // TODO: May be good to refactor to make less redundant, see Megan's suggestion:
      // https://github.com/allen-cell-animated/simularium-viewer/pull/75#discussion_r535519106
      var x = minX;
      while (x <= maxX) {
        verticesArray.push(
        // The 6 coordinates below make up 1 tick mark (2 vertices for 1 line segment)
        x, minY, minZ + tickHalfLength, x, minY, minZ - tickHalfLength,
        // This tick mark is on a different bounding box edge also parallel to the x-axis
        x, minY, maxZ + tickHalfLength, x, minY, maxZ - tickHalfLength,
        // This tick mark is on yet another edge parallel to the x-axis
        x, maxY, minZ + tickHalfLength, x, maxY, minZ - tickHalfLength,
        // For the last edge parallel to the x-axis
        x, maxY, maxZ + tickHalfLength, x, maxY, maxZ - tickHalfLength);
        x += this.tickIntervalLength;
      }

      // Add tick mark vertices for the 4 bounding box edges parallel to the y-axis
      var y = minY;
      while (y <= maxY) {
        verticesArray.push(minX + tickHalfLength, y, minZ, minX - tickHalfLength, y, minZ, minX + tickHalfLength, y, maxZ, minX - tickHalfLength, y, maxZ, maxX + tickHalfLength, y, minZ, maxX - tickHalfLength, y, minZ, maxX + tickHalfLength, y, maxZ, maxX - tickHalfLength, y, maxZ);
        y += this.tickIntervalLength;
      }

      // Add tick mark vertices for the 4 bounding box edges parallel to the z-axis
      var z = minZ;
      while (z <= maxZ) {
        verticesArray.push(minX, minY + tickHalfLength, z, minX, minY - tickHalfLength, z, minX, maxY + tickHalfLength, z, minX, maxY - tickHalfLength, z, maxX, minY + tickHalfLength, z, maxX, minY - tickHalfLength, z, maxX, maxY + tickHalfLength, z, maxX, maxY - tickHalfLength, z);
        z += this.tickIntervalLength;
      }

      // Convert verticesArray into a TypedArray to use with lineGeometry.setAttribute()
      var vertices = new Float32Array(verticesArray);
      lineGeometry.setAttribute("position", new BufferAttribute(vertices, 3));
      var lineMaterial = new LineBasicMaterial({
        color: BOUNDING_BOX_COLOR
      });
      this.tickMarksMesh = new LineSegments(lineGeometry, lineMaterial);
      this.tickMarksMesh.visible = visible;
    }
  }, {
    key: "createBoundingBox",
    value: function createBoundingBox(boundsAsTuple) {
      var _boundsAsTuple2 = _slicedToArray(boundsAsTuple, 6),
        minX = _boundsAsTuple2[0],
        minY = _boundsAsTuple2[1],
        minZ = _boundsAsTuple2[2],
        maxX = _boundsAsTuple2[3],
        maxY = _boundsAsTuple2[4],
        maxZ = _boundsAsTuple2[5];
      var visible = this.boundingBoxMesh ? this.boundingBoxMesh.visible : true;
      this.boundingBox = new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));
      this.boundingBoxMesh = new Box3Helper(this.boundingBox, BOUNDING_BOX_COLOR);
      this.boundingBoxMesh.visible = visible;
    }
  }, {
    key: "resetBounds",
    value: function resetBounds(volumeDimensions) {
      this.scene.remove(this.boundingBoxMesh, this.tickMarksMesh);
      if (!volumeDimensions) {
        this.logger.warn("Invalid volume dimensions received: ".concat(volumeDimensions, "; using defaults."));
        volumeDimensions = DEFAULT_VOLUME_DIMENSIONS;
      }
      var _volumeDimensions = volumeDimensions,
        _volumeDimensions2 = _slicedToArray(_volumeDimensions, 3),
        bx = _volumeDimensions2[0],
        by = _volumeDimensions2[1],
        bz = _volumeDimensions2[2];
      var boundsAsTuple = [-bx / 2, -by / 2, -bz / 2, bx / 2, by / 2, bz / 2];
      this.createBoundingBox(boundsAsTuple);
      this.createTickMarks(volumeDimensions, boundsAsTuple);
      this.scene.add(this.boundingBoxMesh, this.tickMarksMesh);
      if (this.controls) {
        this.controls.maxDistance = this.boundingBox.max.distanceTo(this.boundingBox.min) * 1.414;
      }
    }
  }, {
    key: "setScaleForId",
    value: function setScaleForId(id, scale) {
      this.logger.debug("Scale for id ", id, " set to ", scale);
      this.scaleMapping.set(id, scale);
    }
  }, {
    key: "getScaleForId",
    value: function getScaleForId(id) {
      if (this.scaleMapping.has(id)) {
        var scale = this.scaleMapping.get(id);
        if (scale) {
          return scale;
        }
      }
      return 1;
    }
  }, {
    key: "createAgent",
    value: function createAgent() {
      // TODO limit the number
      var i = this.visAgents.length;
      var agent = new VisAgent("Agent_".concat(i));
      this.visAgents.push(agent);
      return agent;
    }
  }, {
    key: "addPdbToDrawList",
    value: function addPdbToDrawList(typeId, visAgent, pdbEntry) {
      if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
        this.legacyRenderer.addPdb(pdbEntry, visAgent, this.colorHandler.getColorInfoForAgentType(typeId).color, this.lodDistanceStops);
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
  }, {
    key: "addMeshToDrawList",
    value: function addMeshToDrawList(typeId, visAgent, meshEntry, agentData) {
      var radius = agentData.cr ? agentData.cr : 1;
      var scale = this.getScaleForId(typeId);
      var meshGeom = meshEntry.mesh;
      if (!meshGeom) {
        console.warn("MeshEntry is present but mesh unavailable. Not rendering agent.");
      }
      if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
        this.legacyRenderer.addMesh(meshGeom.geometry, visAgent, radius * scale, this.colorHandler.getColorInfoForAgentType(typeId).color);
      } else {
        if (meshEntry && meshEntry.instances) {
          meshEntry.instances.addInstance(agentData.x, agentData.y, agentData.z, radius * scale, agentData.xrot, agentData.yrot, agentData.zrot, visAgent.agentData.instanceId, visAgent.signedTypeId(), 1, agentData.subpoints);
        }
      }
    }
  }, {
    key: "addFiberToDrawList",
    value: function addFiberToDrawList(typeId, visAgent, agentData) {
      visAgent.updateFiber(agentData.subpoints);
      var scale = this.getScaleForId(typeId);
      if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
        this.legacyRenderer.addFiber(visAgent, agentData.cr * scale, this.colorHandler.getColorInfoForAgentType(typeId).color);
      } else {
        // update/add to render list
        this.fibers.addInstance(agentData.subpoints.length / 3, agentData.subpoints, agentData.x, agentData.y, agentData.z, agentData.cr * scale * 0.5, agentData.xrot, agentData.yrot, agentData.zrot, visAgent.agentData.instanceId, visAgent.signedTypeId());
      }
    }

    /**
     *   Update Scene
     **/
  }, {
    key: "updateScene",
    value: function updateScene(agents) {
      var _this5 = this;
      this.currentSceneAgents = agents;

      // values for updating agent path
      var dx = 0,
        dy = 0,
        dz = 0;
      var lastx = 0,
        lasty = 0,
        lastz = 0;
      this.legacyRenderer.beginUpdate(this.scene);
      this.fibers.beginUpdate();
      this.geometryStore.forEachMesh(function (agentGeo) {
        agentGeo.geometry.instances.beginUpdate();
      });
      // these lists must be emptied on every scene update.
      this.agentsWithPdbsToDraw = [];
      this.agentPdbsToDraw = [];

      // First, mark ALL inactive and invisible.
      // Note this implies a memory leak of sorts:
      // the number of agent instances can only grow during one trajectory run.
      // We just hide the unused ones.
      // Worst case is if each frame uses completely different (incrementing) instance ids.
      for (var i = 0; i < MAX_MESHES && i < this.visAgents.length; i += 1) {
        var visAgent = this.visAgents[i];
        visAgent.hideAndDeactivate();
      }
      agents.forEach(function (agentData) {
        var visType = agentData.visType;
        var instanceId = agentData.instanceId;
        var typeId = agentData.type;
        lastx = agentData.x;
        lasty = agentData.y;
        lastz = agentData.z;

        // look up last agent with this instanceId.
        var visAgent = _this5.visAgentInstances.get(instanceId);
        var path = _this5.findPathForAgent(instanceId);
        if (path) {
          if (visAgent) {
            lastx = visAgent.agentData.x;
            lasty = visAgent.agentData.y;
            lastz = visAgent.agentData.z;
          }
        }
        if (!visAgent) {
          visAgent = _this5.createAgent();
          visAgent.agentData.instanceId = instanceId;
          //visAgent.mesh.userData = { id: instanceId };
          _this5.visAgentInstances.set(instanceId, visAgent);
          // set hidden so that it is revealed later in this function:
          visAgent.hidden = true;
        }
        if (visAgent.agentData.instanceId !== instanceId) {
          _this5.logger.warn("incoming instance id ".concat(instanceId, " mismatched with visagent ").concat(visAgent.agentData.instanceId));
        }
        visAgent.active = true;

        // update the agent!
        visAgent.agentData = agentData;
        var isHighlighted = _this5.highlightedIds.includes(visAgent.agentData.type);
        visAgent.setHighlighted(isHighlighted);
        var isHidden = _this5.hiddenIds.includes(visAgent.agentData.type);
        visAgent.setHidden(isHidden);
        if (visAgent.hidden) {
          return;
        }
        visAgent.setColor(_this5.colorHandler.getColorInfoForAgentType(typeId));

        // if not fiber...
        if (visType === VisTypes.ID_VIS_TYPE_DEFAULT) {
          var response = _this5.getGeoForAgentType(typeId);
          if (!response) {
            _this5.logger.warn("No mesh nor pdb available for ".concat(typeId, "? Should be unreachable code"));
            return;
          }
          var geometry = response.geometry,
            displayType = response.displayType;
          if (geometry && displayType === GeometryDisplayType.PDB) {
            var pdbEntry = geometry;
            _this5.addPdbToDrawList(typeId, visAgent, pdbEntry);
          } else {
            var meshEntry = geometry;
            _this5.addMeshToDrawList(typeId, visAgent, meshEntry, agentData);
          }
          dx = agentData.x - lastx;
          dy = agentData.y - lasty;
          dz = agentData.z - lastz;
          if (path) {
            _this5.addPointToPath(path, agentData.x, agentData.y, agentData.z, dx, dy, dz);
          }
        } else if (visType === VisTypes.ID_VIS_TYPE_FIBER) {
          _this5.addFiberToDrawList(typeId, visAgent, agentData);
        }
      });
      this.fibers.endUpdate();
      this.geometryStore.forEachMesh(function (agentGeo) {
        agentGeo.geometry.instances.endUpdate();
      });
      this.legacyRenderer.endUpdate(this.scene);
    }
  }, {
    key: "animateCamera",
    value: function animateCamera() {
      var lerpTarget = true;
      var lerpPosition = true;
      var lerpRate = 0.2;
      var distanceBuffer = 0.002;
      var rotationBuffer = 0.01;
      if (this.followObjectId !== NO_AGENT && this.focusMode) {
        // keep camera at same distance from target.
        var direction = new Vector3().subVectors(this.camera.position, this.controls.target);
        var distance = direction.length();
        direction.normalize();
        var followedObject = this.visAgentInstances.get(this.followObjectId);
        if (!followedObject) {
          return;
        }
        var newTarget = followedObject.getFollowPosition();

        // update controls target for orbiting
        if (lerpTarget) {
          this.controls.target.lerp(newTarget, lerpRate);
        } else {
          this.controls.target.copy(newTarget);
        }

        // update new camera position
        var newPosition = new Vector3();
        newPosition.subVectors(newTarget, direction.multiplyScalar(-distance));
        if (lerpPosition) {
          this.camera.position.lerp(newPosition, lerpRate);
        } else {
          this.camera.position.copy(newPosition);
        }
      } else if (this.needToCenterCamera) {
        this.controls.target.lerp(new Vector3(), lerpRate);
        if (this.controls.target.distanceTo(new Vector3()) < distanceBuffer) {
          this.controls.target.copy(new Vector3());
          this.needToCenterCamera = false;
        }
      } else if (this.needToReOrientCamera) {
        this.controls.target.copy(new Vector3());
        var position = this.camera.position;
        var curDistanceFromCenter = this.rotateDistance;
        var targetPosition = this.initCameraPosition.clone().setLength(curDistanceFromCenter);
        var currentPosition = position.clone();
        var targetQuat = new Quaternion().setFromAxisAngle(targetPosition, 0);
        var currentQuat = new Quaternion().copy(this.camera.quaternion);
        var totalAngle = currentQuat.angleTo(targetQuat);
        var newAngle = lerpRate * totalAngle; // gives same value as using quanternion.slerp
        var normal = currentPosition.clone().cross(targetPosition).normalize();
        this.camera.position.applyAxisAngle(normal, newAngle);
        this.camera.lookAt(new Vector3());

        // it doesnt seem to be able to get to zero, but this was small enough to look good
        if (this.camera.position.angleTo(targetPosition) < rotationBuffer) {
          this.needToReOrientCamera = false;
        }
      }
    }
  }, {
    key: "findPathForAgent",
    value: function findPathForAgent(id) {
      var path = this.agentPaths.get(id);
      if (path) {
        return path;
      }
      return null;
    }

    // assumes color is a threejs color, or null/undefined
  }, {
    key: "addPathForAgent",
    value: function addPathForAgent(id, maxSegments, color) {
      // make sure the idx is not already in our list.
      // could be optimized...
      var foundpath = this.findPathForAgent(id);
      if (foundpath) {
        foundpath.show(true);
        return foundpath;
      }
      if (!maxSegments) {
        maxSegments = MAX_PATH_LEN;
      }
      if (!color) {
        // get the agent's color. is there a simpler way?
        var agent = this.visAgentInstances.get(id);
        if (agent) {
          color = agent.color.clone();
        } else if (this.visAgentInstances.size > 0) {
          console.error("COULD NOT FIND AGENT INSTANCE " + id);
        }
      }
      var pathdata = new AgentPath(color, maxSegments);
      this.agentPathGroup.add(pathdata.line);
      this.agentPaths.set(id, pathdata);
      return pathdata;
    }
  }, {
    key: "removePathForAgent",
    value: function removePathForAgent(id) {
      if (!this.agentPaths["delete"](id)) {
        this.logger.warn("attempted to remove path for agent " + id + " that doesn't exist.");
      }
    }
  }, {
    key: "removeAllPaths",
    value: function removeAllPaths() {
      this.agentPaths.clear();
    }
  }, {
    key: "addPointToPath",
    value: function addPointToPath(path, x, y, z, dx, dy, dz) {
      if (x === dx && y === dy && z === dz) {
        return;
      }
      // Check for periodic boundary condition:
      // if any agent moved more than half the volume size in one step,
      // assume it jumped the boundary going the other way.
      var volumeSize = new Vector3();
      this.boundingBox.getSize(volumeSize);
      if (Math.abs(dx) > volumeSize.x / 2 || Math.abs(dy) > volumeSize.y / 2 || Math.abs(dz) > volumeSize.z / 2) {
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
  }, {
    key: "setShowPaths",
    value: function setShowPaths(showPaths) {
      this.agentPaths.forEach(function (path) {
        path.show(showPaths);
      });
    }
  }, {
    key: "toggleAllAgentsHidden",
    value: function toggleAllAgentsHidden(hideAllAgents) {
      var nMeshes = this.visAgents.length;
      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var visAgent = this.visAgents[i];
        if (visAgent.active) {
          visAgent.setHidden(hideAllAgents);
        }
      }
    }
  }, {
    key: "setShowBounds",
    value: function setShowBounds(showBounds) {
      this.boundingBoxMesh.visible = showBounds;
      this.tickMarksMesh.visible = showBounds;
    }
  }, {
    key: "showPathForAgent",
    value: function showPathForAgent(id, visible) {
      var path = this.findPathForAgent(id);
      if (path) {
        path.show(visible);
      }
    }
  }, {
    key: "clearForNewTrajectory",
    value: function clearForNewTrajectory() {
      this.legacyRenderer.beginUpdate(this.scene);
      this.legacyRenderer.endUpdate(this.scene);
      this.resetMapping();

      // remove current scene agents.
      this.visAgentInstances.clear();
      this.visAgents = [];
      this.currentSceneAgents = [];
      this.dehighlight();
    }
  }, {
    key: "resetAllGeometry",
    value: function resetAllGeometry() {
      this.geometryStore.cancelAll();
      this.unfollow();
      this.removeAllPaths();

      // remove geometry from all visible scene groups.
      // Object3D.remove can be slow, and just doing it in-order here
      // is faster than doing it in the loop over all visAgents
      this.legacyRenderer.beginUpdate(this.scene);
      this.legacyRenderer.endUpdate(this.scene);
      for (var i = this.instancedMeshGroup.children.length - 1; i >= 0; i--) {
        this.instancedMeshGroup.remove(this.instancedMeshGroup.children[i]);
      }

      // recreate an empty set of fibers to clear out the old ones.
      this.constructInstancedFibers();

      // set all runtime meshes back to spheres.
      var _iterator2 = _createForOfIteratorHelper(this.visAgentInstances.values()),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var visAgent = _step2.value;
          visAgent.resetMesh();
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
  }, {
    key: "update",
    value: function update(agents) {
      this.updateScene(agents);
    }
  }]);
  return VisGeometry;
}();
export { VisGeometry, NO_AGENT };
export default VisGeometry;