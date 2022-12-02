import _slicedToArray from "@babel/runtime/helpers/slicedToArray";
import _toConsumableArray from "@babel/runtime/helpers/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

import WEBGL from "three/examples/jsm/capabilities/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Box3, Box3Helper, BufferAttribute, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, LineBasicMaterial, LineSegments, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer, Quaternion, MOUSE } from "three";
import { Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import jsLogger from "js-logger";
import { cloneDeep, noop } from "lodash";
import VisAgent from "./VisAgent";
import VisTypes from "../simularium/VisTypes";
import AgentPath from "./agentPath";
import { FrontEndError, ErrorLevel } from "../simularium/FrontEndError";
import { DEFAULT_CAMERA_Z_POSITION, DEFAULT_CAMERA_SPEC } from "../constants";
import SimulariumRenderer from "./rendering/SimulariumRenderer";
import { InstancedFiberGroup } from "./rendering/InstancedFiber";
import { LegacyRenderer } from "./rendering/LegacyRenderer";
import GeometryStore, { DEFAULT_MESH_NAME } from "./GeometryStore";
import { GeometryDisplayType } from "./types";
import { checkAndSanitizePath } from "../util";
import { convertColorStringToNumber } from "./color-utils";
var MAX_PATH_LEN = 32;
var MAX_MESHES = 100000;
var DEFAULT_BACKGROUND_COLOR = new Color(0, 0, 0);
var DEFAULT_VOLUME_DIMENSIONS = [300, 300, 300]; // tick interval length = length of the longest bounding box edge / NUM_TICK_INTERVALS

var NUM_TICK_INTERVALS = 10; // tick mark length = 2 * (length of the longest bounding box edge / TICK_LENGTH_FACTOR)

var TICK_LENGTH_FACTOR = 100;
var BOUNDING_BOX_COLOR = new Color(0x6e6e6e);
var NO_AGENT = -1;
var CAMERA_DOLLY_STEP_SIZE = 10;
var CAMERA_INITIAL_ZNEAR = 1.0;
var CAMERA_INITIAL_ZFAR = 1000.0;
export var RenderStyle;

(function (RenderStyle) {
  RenderStyle[RenderStyle["WEBGL1_FALLBACK"] = 0] = "WEBGL1_FALLBACK";
  RenderStyle[RenderStyle["WEBGL2_PREFERRED"] = 1] = "WEBGL2_PREFERRED";
})(RenderStyle || (RenderStyle = {}));

function removeByName(group, name) {
  var childrenToRemove = [];
  group.traverse(function (child) {
    if (child.name == name) {
      childrenToRemove.push(child);
    }
  });
  childrenToRemove.forEach(function (child) {
    group.remove(child);
  });
}

var VisGeometry = /*#__PURE__*/function () {
  // maps agent type id to agent geometry name
  // this is the threejs object that issues all the webgl calls
  // front and back of transformed bounds in camera space
  // Scene update will populate these lists of visible pdb agents.
  // These lists are iterated at render time to detemine LOD.
  // This is because camera updates happen at a different frequency than scene updates.
  function VisGeometry(loggerLevel) {
    _classCallCheck(this, VisGeometry);

    _defineProperty(this, "onError", void 0);

    _defineProperty(this, "renderStyle", void 0);

    _defineProperty(this, "backgroundColor", void 0);

    _defineProperty(this, "pathEndColor", void 0);

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

    _defineProperty(this, "threejsrenderer", void 0);

    _defineProperty(this, "scene", void 0);

    _defineProperty(this, "camera", void 0);

    _defineProperty(this, "controls", void 0);

    _defineProperty(this, "dl", void 0);

    _defineProperty(this, "boundingBox", void 0);

    _defineProperty(this, "boundingBoxMesh", void 0);

    _defineProperty(this, "tickIntervalLength", void 0);

    _defineProperty(this, "tickMarksMesh", void 0);

    _defineProperty(this, "boxNearZ", void 0);

    _defineProperty(this, "boxFarZ", void 0);

    _defineProperty(this, "hemiLight", void 0);

    _defineProperty(this, "renderer", void 0);

    _defineProperty(this, "legacyRenderer", void 0);

    _defineProperty(this, "currentSceneAgents", void 0);

    _defineProperty(this, "colorsData", void 0);

    _defineProperty(this, "lightsGroup", void 0);

    _defineProperty(this, "agentPathGroup", void 0);

    _defineProperty(this, "instancedMeshGroup", void 0);

    _defineProperty(this, "idColorMapping", void 0);

    _defineProperty(this, "isIdColorMappingSet", void 0);

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
    this.idColorMapping = new Map();
    this.isIdColorMappingSet = false;
    this.followObjectId = NO_AGENT;
    this.visAgents = [];
    this.visAgentInstances = new Map();
    this.fixLightsToCamera = true;
    this.highlightedIds = [];
    this.hiddenIds = [];
    this.needToCenterCamera = false;
    this.needToReOrientCamera = false;
    this.rotateDistance = DEFAULT_CAMERA_Z_POSITION; // will store data for all agents that are drawing paths

    this.agentPaths = new Map();
    this.fibers = new InstancedFiberGroup();
    this.scene = new Scene();
    this.lightsGroup = new Group();
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
    this.camera = new PerspectiveCamera(75, 100 / 100, CAMERA_INITIAL_ZNEAR, CAMERA_INITIAL_ZFAR);
    this.initCameraPosition = this.camera.position.clone();
    this.cameraDefault = cloneDeep(DEFAULT_CAMERA_SPEC);
    this.dl = new DirectionalLight(0xffffff, 0.6);
    this.hemiLight = new HemisphereLight(0xffffff, 0x000000, 0.5);
    this.threejsrenderer = new WebGLRenderer({
      premultipliedAlpha: false
    });
    this.controls = new OrbitControls(this.camera, this.threejsrenderer.domElement);
    this.setPanningMode(false);
    this.focusMode = true;
    this.boundingBox = new Box3(new Vector3(0, 0, 0), new Vector3(100, 100, 100));
    this.boundingBoxMesh = new Box3Helper(this.boundingBox, BOUNDING_BOX_COLOR);
    this.tickIntervalLength = 0;
    this.tickMarksMesh = new LineSegments();
    this.boxNearZ = 0;
    this.boxFarZ = 100;
    this.currentSceneAgents = [];
    this.colorsData = new Float32Array(0);
    this.lodBias = 0;
    this.lodDistanceStops = [100, 200, 400, Number.MAX_VALUE];
    this.agentsWithPdbsToDraw = [];
    this.agentPdbsToDraw = [];

    this.onError = function
      /*errorMessage*/
    () {
      return noop;
    };
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
  }, {
    key: "loadCamera",
    value: function loadCamera(cameraSpec) {
      // TODO add other parameters from CameraSpec?
      this.camera.position.set(cameraSpec.position.x, cameraSpec.position.y, cameraSpec.position.z);
      this.controls.target.set(cameraSpec.lookAtPosition.x, cameraSpec.lookAtPosition.y, cameraSpec.lookAtPosition.z);
    }
  }, {
    key: "storeCamera",
    value: function storeCamera(cameraSpec) {
      cameraSpec.position.x = this.camera.position.x;
      cameraSpec.position.y = this.camera.position.y;
      cameraSpec.position.z = this.camera.position.z;
      cameraSpec.lookAtPosition.x = this.controls.target.x;
      cameraSpec.lookAtPosition.y = this.controls.target.y;
      cameraSpec.lookAtPosition.z = this.controls.target.z;
    }
  }, {
    key: "applyAO",
    value: function applyAO(ao) {
      this.renderer.applyAO(ao);
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
      fcam.addInput(this.camera, "position");
      fcam.addInput(this.controls, "target");
      [{
        camera: this.cam1,
        label: "Cam 1"
      }, {
        camera: this.cam2,
        label: "Cam 2"
      }, {
        camera: this.cam3,
        label: "Cam 3"
      }].forEach(function (_ref) {
        var _this$gui;

        var camera = _ref.camera,
            label = _ref.label;
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
        var _this$gui2;

        var preset = (_this$gui2 = _this.gui) === null || _this$gui2 === void 0 ? void 0 : _this$gui2.exportPreset();
        var cam = {
          position: preset === null || preset === void 0 ? void 0 : preset.position,
          target: preset === null || preset === void 0 ? void 0 : preset.target
        };
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

            var obj = JSON.parse(event === null || event === void 0 ? void 0 : (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.result);
            var cam = cloneDeep(DEFAULT_CAMERA_SPEC);
            cam.position = obj.position;
            cam.lookAtPosition = obj.target;

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
      removeByName(this.instancedMeshGroup, InstancedFiberGroup.GROUP_NAME); // tell instanced geometry what representation to use.

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
        this.cameraDefault = cameraDefault;
      } else {
        this.logger.info("Using default camera settings since none were provided");
        this.cameraDefault = cloneDeep(DEFAULT_CAMERA_SPEC);
      }

      this.resetCamera();
    } // Called when a new file is loaded, the Clear button is clicked, or Reset Camera button is clicked

  }, {
    key: "resetCamera",
    value: function resetCamera() {
      this.followObjectId = NO_AGENT;
      this.controls.reset();
      this.resetCameraPosition();
    } // Sets camera position and orientation to the trajectory's initial (default) values

  }, {
    key: "resetCameraPosition",
    value: function resetCameraPosition() {
      var _this$cameraDefault = this.cameraDefault,
          position = _this$cameraDefault.position,
          upVector = _this$cameraDefault.upVector,
          lookAtPosition = _this$cameraDefault.lookAtPosition,
          fovDegrees = _this$cameraDefault.fovDegrees; // Reset camera position

      this.camera.position.set(position.x, position.y, position.z);
      this.initCameraPosition = this.camera.position.clone(); // Reset up vector (needs to be a unit vector)

      var normalizedUpVector = new Vector3(upVector.x, upVector.y, upVector.z).normalize();
      this.camera.up.set(normalizedUpVector.x, normalizedUpVector.y, normalizedUpVector.z); // Reset lookat position

      this.camera.lookAt(lookAtPosition.x, lookAtPosition.y, lookAtPosition.z);
      this.controls.target.set(lookAtPosition.x, lookAtPosition.y, lookAtPosition.z); // Reset field of view

      this.camera.fov = fovDegrees; // Apply the changes above

      this.camera.updateProjectionMatrix();
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
      var position = this.camera.position.clone();
      var target = this.controls.target.clone();
      var distance = position.distanceTo(target);
      var newDistance = distance + changeBy;

      if (newDistance <= this.controls.minDistance || newDistance >= this.controls.maxDistance) {
        return;
      }

      var newPosition = new Vector3().subVectors(position, target).setLength(newDistance);
      this.camera.position.copy(new Vector3().addVectors(newPosition, target));
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
    key: "setFocusMode",
    value: function setFocusMode(focus) {
      this.focusMode = focus;
    }
  }, {
    key: "getFollowObject",
    value: function getFollowObject() {
      return this.followObjectId;
    }
  }, {
    key: "setFollowObject",
    value: function setFollowObject(obj) {
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
      return _toConsumableArray(this.visGeomMap.entries()).filter(function (_ref2) {
        var v = _ref2[1];
        return v === name;
      }).map(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 1),
            k = _ref4[0];

        return k;
      });
    }
  }, {
    key: "onNewRuntimeGeometryType",
    value: function onNewRuntimeGeometryType(geoName, displayType, data) {
      // find all typeIds for this meshName
      var typeIds = this.getAllTypeIdsForGeometryName(geoName); // assuming the meshLoadRequest has already been added to the registry

      if (data === undefined) {
        console.error("Mesh name ".concat(geoName, " not found in mesh registry"));
        return;
      } // go over all objects and update mesh of this typeId
      // if this happens before the first updateScene, then the visAgents don't have type id's yet.


      var nMeshes = this.visAgents.length;

      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var visAgent = this.visAgents[i];

        if (typeIds.includes(visAgent.agentData.type)) {
          visAgent.setColor(this.getColorForTypeId(visAgent.agentData.type), this.getColorIndexForTypeId(visAgent.agentData.type));
        }
      }

      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "setUpControls",
    value: function setUpControls(element) {
      var _this2 = this;

      this.controls = new OrbitControls(this.camera, element);
      this.controls.addEventListener("change", function () {
        if (_this2.gui) {
          _this2.gui.refresh();
        }
      });
      this.controls.maxDistance = 750;
      this.controls.minDistance = 1;
      this.controls.zoomSpeed = 1.0;
      this.setPanningMode(false);
      this.controls.saveState();
    }
    /**
     *   Setup ThreeJS Scene
     * */

  }, {
    key: "setupScene",
    value: function setupScene() {
      var initWidth = 100;
      var initHeight = 100;
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
      this.camera = new PerspectiveCamera(75, initWidth / initHeight, CAMERA_INITIAL_ZNEAR, CAMERA_INITIAL_ZFAR);
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
      } // set this up after the renderStyle has been set.


      this.constructInstancedFibers();
      this.threejsrenderer.setSize(initWidth, initHeight); // expected to change when reparented

      this.threejsrenderer.setClearColor(this.backgroundColor, 1);
      this.threejsrenderer.clear();
      this.camera.position.z = DEFAULT_CAMERA_Z_POSITION;
      this.initCameraPosition = this.camera.position.clone();
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      // at least 2x2 in size when resizing, to prevent bad buffer sizes
      width = Math.max(width, 2);
      height = Math.max(height, 2);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.threejsrenderer.setSize(width, height);
      this.renderer.resize(width, height);
    }
  }, {
    key: "reparent",
    value: function reparent(parent) {
      var _this3 = this;

      if (parent === undefined || parent == null) {
        return;
      }

      parent.appendChild(this.threejsrenderer.domElement);
      this.setUpControls(this.threejsrenderer.domElement);
      this.resize(parent.scrollWidth, parent.scrollHeight);
      this.threejsrenderer.setClearColor(this.backgroundColor, 1.0);
      this.threejsrenderer.clear();
      this.threejsrenderer.domElement.setAttribute("style", "top: 0px; left: 0px");

      this.threejsrenderer.domElement.onmouseenter = function () {
        return _this3.enableControls();
      };

      this.threejsrenderer.domElement.onmouseleave = function () {
        return _this3.disableControls();
      };
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
        var agentData = visAgent.agentData; // TODO should visAgent hold onto its PDBEntry? would save this second array

        var pdbModel = this.agentPdbsToDraw[i];
        agentPos.set(agentData.x, agentData.y, agentData.z);
        var agentDistance = this.camera.position.distanceTo(agentPos);

        for (var j = 0; j < this.lodDistanceStops.length; ++j) {
          // the first distance less than.
          if (agentDistance < this.lodDistanceStops[j]) {
            var index = j + this.lodBias;
            var instancedPdb = pdbModel.getLOD(index);
            instancedPdb.addInstance(agentData.x, agentData.y, agentData.z, // We do not support scaling of pdb yet.
            // pdb positions are already in native physical units
            1.0, agentData.xrot, agentData.yrot, agentData.zrot, visAgent.agentData.instanceId, visAgent.signedTypeId(), // a scale value for LODs
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
      this.transformBoundingBox(); // Tight bounds with fudge factor because the bounding box is not really
      // bounding.  Also allow for camera to be inside of box.

      this.camera.near = Math.max(this.boxNearZ * 0.66, CAMERA_INITIAL_ZNEAR);
      this.camera.far = Math.min(this.boxFarZ * 1.33, CAMERA_INITIAL_ZFAR);
      this.camera.updateProjectionMatrix(); // update light sources due to camera moves

      if (this.dl && this.fixLightsToCamera) {
        // position directional light at camera (facing scene, as headlight!)
        this.dl.position.setFromMatrixColumn(this.camera.matrixWorld, 2);
      }

      if (this.hemiLight && this.fixLightsToCamera) {
        // make hemi light come down from vertical of screen (camera up)
        this.hemiLight.position.setFromMatrixColumn(this.camera.matrixWorld, 1);
      } // remove all children of instancedMeshGroup.  we will re-add them.


      for (var i = this.instancedMeshGroup.children.length - 1; i >= 0; i--) {
        this.instancedMeshGroup.remove(this.instancedMeshGroup.children[i]);
      } // re-add fibers immediately


      this.instancedMeshGroup.add(this.fibers.getGroup());

      if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
        // meshes only.
        this.threejsrenderer.render(this.scene, this.camera);
      } else {
        this.setPdbLods();
        this.scene.updateMatrixWorld();
        this.scene.autoUpdate = false; // collect up the meshes that have > 0 instances

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
        this.renderer.setNearFar(this.boxNearZ, this.boxFarZ);
        this.boundingBoxMesh.visible = false;
        this.tickMarksMesh.visible = false;
        this.agentPathGroup.visible = false;
        this.renderer.render(this.threejsrenderer, this.scene, this.camera, null); // final pass, add extra stuff on top: bounding box and line paths

        this.boundingBoxMesh.visible = true;
        this.tickMarksMesh.visible = true;
        this.agentPathGroup.visible = true;
        this.threejsrenderer.autoClear = false; // hide everything except the wireframe and paths, and render with the standard renderer

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
      var box = new Box3().copy(this.boundingBox); // world to camera space

      box.applyMatrix4(this.camera.matrixWorldInverse); // camera is pointing along negative Z.  so invert for positive distances

      this.boxNearZ = -box.max.z;
      this.boxFarZ = -box.min.z; // compare with CompositePass float eyeDepth = -col0.z; to use a positive distance value.
    }
  }, {
    key: "hitTest",
    value: function hitTest(offsetX, offsetY) {
      var size = new Vector2();
      this.threejsrenderer.getSize(size);

      if (this.renderStyle === RenderStyle.WEBGL1_FALLBACK) {
        var mouse = {
          x: offsetX / size.x * 2 - 1,
          y: -(offsetY / size.y) * 2 + 1
        };
        return this.legacyRenderer.hitTest(mouse, this.camera);
      } else {
        // read from instance buffer pixel!
        return this.renderer.hitTest(this.threejsrenderer, offsetX, size.y - offsetY);
      }
    }
  }, {
    key: "setAgentColors",
    value: function setAgentColors() {
      var _this4 = this;

      this.visAgents.forEach(function (agent) {
        agent.setColor(_this4.getColorForTypeId(agent.agentData.type), _this4.getColorIndexForTypeId(agent.agentData.type));
      });
    }
  }, {
    key: "setColorArray",
    value: function setColorArray(colors) {
      var colorNumbers = colors.map(convertColorStringToNumber);
      var numColors = colors.length; // fill buffer of colors:

      this.colorsData = new Float32Array(numColors * 4);

      for (var i = 0; i < numColors; i += 1) {
        // each color is currently a hex value:
        this.colorsData[i * 4 + 0] = ((colorNumbers[i] & 0x00ff0000) >> 16) / 255.0;
        this.colorsData[i * 4 + 1] = ((colorNumbers[i] & 0x0000ff00) >> 8) / 255.0;
        this.colorsData[i * 4 + 2] = ((colorNumbers[i] & 0x000000ff) >> 0) / 255.0;
        this.colorsData[i * 4 + 3] = 1.0;
      }
    }
  }, {
    key: "addNewColor",
    value: function addNewColor(color) {
      var colorNumber = convertColorStringToNumber(color);
      var newColor = [((colorNumber & 0x00ff0000) >> 16) / 255.0, ((colorNumber & 0x0000ff00) >> 8) / 255.0, ((colorNumber & 0x000000ff) >> 0) / 255.0, 1.0];
      var newArray = [].concat(_toConsumableArray(this.colorsData), newColor);
      var newColorData = new Float32Array(newArray.length);
      newColorData.set(newArray);
      this.colorsData = newColorData;
    }
  }, {
    key: "createMaterials",
    value: function createMaterials(colors) {
      this.setColorArray(colors);
      this.renderer.updateColors(colors.length, this.colorsData);
      this.setAgentColors();
    }
  }, {
    key: "clearColorMapping",
    value: function clearColorMapping() {
      this.idColorMapping.clear();
      this.isIdColorMappingSet = false;
    }
  }, {
    key: "getColorIndexForTypeId",
    value: function getColorIndexForTypeId(typeId) {
      var index = this.idColorMapping.get(typeId);

      if (index === undefined) {
        this.logger.error("getColorIndexForTypeId could not find " + typeId);
        return 0;
      }

      return index % (this.colorsData.length / 4);
    }
  }, {
    key: "getColorForTypeId",
    value: function getColorForTypeId(typeId) {
      var index = this.getColorIndexForTypeId(typeId);
      return this.getColorForIndex(index);
    }
  }, {
    key: "setColorForId",
    value: function setColorForId(id, colorId) {
      /**
       * @param id agent id
       * @param colorId index into the color array
       */
      this.idColorMapping.set(id, colorId); // if we don't have a mesh for this, add a sphere instance to mesh registry?

      if (!this.visGeomMap.has(id)) {
        this.visGeomMap.set(id, DEFAULT_MESH_NAME);
      }
    }
  }, {
    key: "setColorForIds",
    value: function setColorForIds(ids, colorId) {
      var _this5 = this;

      /**
       * Sets one color for a set of ids, using an index into a color array
       * @param ids agent ids that should all have the same color
       * @param colorId index into the color array
       */
      if (this.isIdColorMappingSet) {
        throw new FrontEndError("Attempted to set agent-color after color mapping was finalized");
      }

      ids.forEach(function (id) {
        return _this5.setColorForId(id, colorId);
      });
    }
  }, {
    key: "getColorForIndex",
    value: function getColorForIndex(index) {
      return new Color(this.colorsData[index * 4], this.colorsData[index * 4 + 1], this.colorsData[index * 4 + 2]);
    }
  }, {
    key: "finalizeIdColorMapping",
    value: function finalizeIdColorMapping() {
      this.isIdColorMappingSet = true;
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
      var _this6 = this;

      this.logger.info("Received type mapping data: ", typeMapping);
      Object.keys(typeMapping).forEach(function (id) {
        var entry = typeMapping[id];
        var _entry$geometry = entry.geometry,
            url = _entry$geometry.url,
            displayType = _entry$geometry.displayType;
        var lookupKey = url ? checkAndSanitizePath(url) : displayType; // map id --> lookupKey

        _this6.visGeomMap.set(Number(id), lookupKey); // get geom for lookupKey,
        // will only load each geometry once, so may return nothing
        // if the same geometry is assigned to more than one agent


        _this6.geometryStore.mapKeyToGeom(Number(id), entry.geometry).then(function (newGeometryLoaded) {
          if (!newGeometryLoaded) {
            // no new geometry to load
            return;
          } // will only have a returned displayType if it changed.


          var returnedDisplayType = newGeometryLoaded.displayType,
              geometry = newGeometryLoaded.geometry,
              errorMessage = newGeometryLoaded.errorMessage;
          var newDisplayType = returnedDisplayType || displayType;

          _this6.onNewRuntimeGeometryType(lookupKey, newDisplayType, geometry); // handle additional async update to LOD for pdbs


          if (newDisplayType === GeometryDisplayType.PDB && geometry) {
            var pdbModel = geometry;
            return pdbModel.generateLOD().then(function () {
              _this6.logger.info("Finished loading pdb LODs: ", lookupKey);

              _this6.onNewRuntimeGeometryType(lookupKey, newDisplayType, geometry);
            });
          } // if returned with a resolve, but has an error message,
          // the error was handled, and the geometry was replaced with a sphere
          // but still good to tell the user about it.


          if (errorMessage) {
            _this6.onError(new FrontEndError(errorMessage, ErrorLevel.WARNING));

            _this6.logger.info(errorMessage);
          }
        })["catch"](function (reason) {
          _this6.onError(new FrontEndError(reason));

          _this6.logger.info(reason);
        });
      });
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "setTickIntervalLength",
    value: function setTickIntervalLength(axisLength) {
      var tickIntervalLength = axisLength / NUM_TICK_INTERVALS; // TODO: round tickIntervalLength to a nice number

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
      var longestEdgeLength = Math.max.apply(Math, _toConsumableArray(volumeDimensions)); // Use the length of the longest bounding box edge to determine the tick interval (scale bar) length

      this.setTickIntervalLength(longestEdgeLength); // The size of tick marks also depends on the length of the longest bounding box edge

      var tickHalfLength = longestEdgeLength / TICK_LENGTH_FACTOR;
      var lineGeometry = new BufferGeometry();
      var verticesArray = []; // Add tick mark vertices for the 4 bounding box edges parallel to the x-axis
      // TODO: May be good to refactor to make less redundant, see Megan's suggestion:
      // https://github.com/allen-cell-animated/simularium-viewer/pull/75#discussion_r535519106

      var x = minX;

      while (x <= maxX) {
        verticesArray.push( // The 6 coordinates below make up 1 tick mark (2 vertices for 1 line segment)
        x, minY, minZ + tickHalfLength, x, minY, minZ - tickHalfLength, // This tick mark is on a different bounding box edge also parallel to the x-axis
        x, minY, maxZ + tickHalfLength, x, minY, maxZ - tickHalfLength, // This tick mark is on yet another edge parallel to the x-axis
        x, maxY, minZ + tickHalfLength, x, maxY, minZ - tickHalfLength, // For the last edge parallel to the x-axis
        x, maxY, maxZ + tickHalfLength, x, maxY, maxZ - tickHalfLength);
        x += this.tickIntervalLength;
      } // Add tick mark vertices for the 4 bounding box edges parallel to the y-axis


      var y = minY;

      while (y <= maxY) {
        verticesArray.push(minX + tickHalfLength, y, minZ, minX - tickHalfLength, y, minZ, minX + tickHalfLength, y, maxZ, minX - tickHalfLength, y, maxZ, maxX + tickHalfLength, y, minZ, maxX - tickHalfLength, y, minZ, maxX + tickHalfLength, y, maxZ, maxX - tickHalfLength, y, maxZ);
        y += this.tickIntervalLength;
      } // Add tick mark vertices for the 4 bounding box edges parallel to the z-axis


      var z = minZ;

      while (z <= maxZ) {
        verticesArray.push(minX, minY + tickHalfLength, z, minX, minY - tickHalfLength, z, minX, maxY + tickHalfLength, z, minX, maxY - tickHalfLength, z, maxX, minY + tickHalfLength, z, maxX, minY - tickHalfLength, z, maxX, maxY + tickHalfLength, z, maxX, maxY - tickHalfLength, z);
        z += this.tickIntervalLength;
      } // Convert verticesArray into a TypedArray to use with lineGeometry.setAttribute()


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
        this.legacyRenderer.addPdb(pdbEntry, visAgent, this.getColorForTypeId(typeId), this.lodDistanceStops);
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
        this.legacyRenderer.addMesh(meshGeom.geometry, visAgent, radius * scale, this.getColorForTypeId(typeId));
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
        this.legacyRenderer.addFiber(visAgent, agentData.cr * scale, this.getColorForTypeId(typeId));
      } else {
        // update/add to render list
        this.fibers.addInstance(agentData.subpoints.length / 3, agentData.subpoints, agentData.x, agentData.y, agentData.z, agentData.cr * scale * 0.5, visAgent.agentData.instanceId, visAgent.signedTypeId());
      }
    }
    /**
     *   Update Scene
     **/

  }, {
    key: "updateScene",
    value: function updateScene(agents) {
      var _this7 = this;

      if (!this.isIdColorMappingSet) {
        return;
      }

      this.currentSceneAgents = agents; // values for updating agent path

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
      }); // these lists must be emptied on every scene update.

      this.agentsWithPdbsToDraw = [];
      this.agentPdbsToDraw = []; // First, mark ALL inactive and invisible.
      // Note this implies a memory leak of sorts:
      // the number of agent instances can only grow during one trajectory run.
      // We just hide the unused ones.
      // Worst case is if each frame uses completely different (incrementing) instance ids.

      for (var i = 0; i < MAX_MESHES && i < this.visAgents.length; i += 1) {
        var visAgent = this.visAgents[i];
        visAgent.hideAndDeactivate();
      }

      agents.forEach(function (agentData) {
        var visType = agentData["vis-type"];
        var instanceId = agentData.instanceId;
        var typeId = agentData.type;
        lastx = agentData.x;
        lasty = agentData.y;
        lastz = agentData.z; // look up last agent with this instanceId.

        var visAgent = _this7.visAgentInstances.get(instanceId);

        var path = _this7.findPathForAgent(instanceId);

        if (path) {
          if (visAgent) {
            lastx = visAgent.agentData.x;
            lasty = visAgent.agentData.y;
            lastz = visAgent.agentData.z;
          }
        }

        if (!visAgent) {
          visAgent = _this7.createAgent();
          visAgent.agentData.instanceId = instanceId; //visAgent.mesh.userData = { id: instanceId };

          _this7.visAgentInstances.set(instanceId, visAgent); // set hidden so that it is revealed later in this function:


          visAgent.hidden = true;
        }

        if (visAgent.agentData.instanceId !== instanceId) {
          _this7.logger.warn("incoming instance id ".concat(instanceId, " mismatched with visagent ").concat(visAgent.agentData.instanceId));
        }

        visAgent.active = true; // update the agent!

        visAgent.agentData = agentData;

        var isHighlighted = _this7.highlightedIds.includes(visAgent.agentData.type);

        visAgent.setHighlighted(isHighlighted);

        var isHidden = _this7.hiddenIds.includes(visAgent.agentData.type);

        visAgent.setHidden(isHidden);

        if (visAgent.hidden) {
          return;
        }

        visAgent.setColor(_this7.getColorForTypeId(typeId), _this7.getColorIndexForTypeId(typeId)); // if not fiber...

        if (visType === VisTypes.ID_VIS_TYPE_DEFAULT) {
          var response = _this7.getGeoForAgentType(typeId);

          if (!response) {
            _this7.logger.warn("No mesh nor pdb available for ".concat(typeId, "? Should be unreachable code"));

            return;
          }

          var geometry = response.geometry,
              displayType = response.displayType;

          if (geometry && displayType === GeometryDisplayType.PDB) {
            var pdbEntry = geometry;

            _this7.addPdbToDrawList(typeId, visAgent, pdbEntry);
          } else {
            var meshEntry = geometry;

            _this7.addMeshToDrawList(typeId, visAgent, meshEntry, agentData);
          }

          dx = agentData.x - lastx;
          dy = agentData.y - lasty;
          dz = agentData.z - lastz;

          if (path) {
            _this7.addPointToPath(path, agentData.x, agentData.y, agentData.z, dx, dy, dz);
          }
        } else if (visType === VisTypes.ID_VIS_TYPE_FIBER) {
          _this7.addFiberToDrawList(typeId, visAgent, agentData);
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

        var newTarget = followedObject.getFollowPosition(); // update controls target for orbiting

        if (lerpTarget) {
          this.controls.target.lerp(newTarget, lerpRate);
        } else {
          this.controls.target.copy(newTarget);
        } // update new camera position


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
        this.camera.lookAt(new Vector3()); // it doesnt seem to be able to get to zero, but this was small enough to look good

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
    } // assumes color is a threejs color, or null/undefined

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
        } else {
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
      } // Check for periodic boundary condition:
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
      this.resetMapping(); // remove current scene agents.

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
      this.removeAllPaths(); // remove geometry from all visible scene groups.
      // Object3D.remove can be slow, and just doing it in-order here
      // is faster than doing it in the loop over all visAgents

      this.legacyRenderer.beginUpdate(this.scene);
      this.legacyRenderer.endUpdate(this.scene);

      for (var i = this.instancedMeshGroup.children.length - 1; i >= 0; i--) {
        this.instancedMeshGroup.remove(this.instancedMeshGroup.children[i]);
      } // recreate an empty set of fibers to clear out the old ones.


      this.constructInstancedFibers(); // set all runtime meshes back to spheres.

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