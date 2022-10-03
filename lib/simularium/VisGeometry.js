"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.NO_AGENT = exports.VisGeometry = exports.RenderStyle = void 0;

var _WebGL = require("three/examples/jsm/WebGL.js");

var _OBJLoader = require("three/examples/jsm/loaders/OBJLoader");

var _OrbitControls = require("three/examples/jsm/controls/OrbitControls");

var _VisAgent = _interopRequireDefault(require("./VisAgent"));

var _VisTypes = _interopRequireWildcard(require("./VisTypes"));

var _PDBModel = _interopRequireDefault(require("./PDBModel"));

var _TaskQueue = _interopRequireWildcard(require("./worker/TaskQueue"));

var _three = require("three");

var dat = _interopRequireWildcard(require("dat.gui"));

var _jsLogger = _interopRequireDefault(require("js-logger"));

var _MoleculeRenderer = _interopRequireDefault(require("./rendering/MoleculeRenderer"));

var _InstancedFiberEndcaps = _interopRequireDefault(require("./rendering/InstancedFiberEndcaps"));

var _InstancedFiberEndcapsFallback = _interopRequireDefault(require("./rendering/InstancedFiberEndcapsFallback"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var MAX_PATH_LEN = 32;
var MAX_MESHES = 100000;
var DEFAULT_BACKGROUND_COLOR = new _three.Color(0, 0, 0);
var DEFAULT_VOLUME_DIMENSIONS = [300, 300, 300]; // tick interval length = length of the longest bounding box edge / NUM_TICK_INTERVALS

var NUM_TICK_INTERVALS = 10; // tick mark length = 2 * (length of the longest bounding box edge / TICK_LENGTH_FACTOR)

var TICK_LENGTH_FACTOR = 100;
var BOUNDING_BOX_COLOR = new _three.Color(0x6e6e6e);
var NO_AGENT = -1;
exports.NO_AGENT = NO_AGENT;
var DEFAULT_CAMERA_Z_POSITION = 120;
var CAMERA_DOLLY_STEP_SIZE = 10;
var RenderStyle;
exports.RenderStyle = RenderStyle;

(function (RenderStyle) {
  RenderStyle[RenderStyle["GENERIC"] = 0] = "GENERIC";
  RenderStyle[RenderStyle["MOLECULAR"] = 1] = "MOLECULAR";
})(RenderStyle || (exports.RenderStyle = RenderStyle = {}));

function lerp(x0, x1, alpha) {
  return x0 + (x1 - x0) * alpha;
}

var VisGeometry = /*#__PURE__*/function () {
  // front and back of transformed bounds in camera space
  function VisGeometry(loggerLevel) {
    _classCallCheck(this, VisGeometry);

    _defineProperty(this, "renderStyle", void 0);

    _defineProperty(this, "backgroundColor", void 0);

    _defineProperty(this, "pathEndColor", void 0);

    _defineProperty(this, "visGeomMap", void 0);

    _defineProperty(this, "meshRegistry", void 0);

    _defineProperty(this, "pdbRegistry", void 0);

    _defineProperty(this, "meshLoadAttempted", void 0);

    _defineProperty(this, "pdbLoadAttempted", void 0);

    _defineProperty(this, "scaleMapping", void 0);

    _defineProperty(this, "followObjectId", void 0);

    _defineProperty(this, "visAgents", void 0);

    _defineProperty(this, "visAgentInstances", void 0);

    _defineProperty(this, "fixLightsToCamera", void 0);

    _defineProperty(this, "highlightedIds", void 0);

    _defineProperty(this, "hiddenIds", void 0);

    _defineProperty(this, "paths", void 0);

    _defineProperty(this, "mlogger", void 0);

    _defineProperty(this, "renderer", void 0);

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

    _defineProperty(this, "moleculeRenderer", void 0);

    _defineProperty(this, "atomSpread", 3.0);

    _defineProperty(this, "numAtomsPerAgent", 8);

    _defineProperty(this, "currentSceneAgents", void 0);

    _defineProperty(this, "colorsData", void 0);

    _defineProperty(this, "lightsGroup", void 0);

    _defineProperty(this, "agentMeshGroup", void 0);

    _defineProperty(this, "agentFiberGroup", void 0);

    _defineProperty(this, "agentPDBGroup", void 0);

    _defineProperty(this, "agentPathGroup", void 0);

    _defineProperty(this, "instancedMeshGroup", void 0);

    _defineProperty(this, "idColorMapping", void 0);

    _defineProperty(this, "raycaster", void 0);

    _defineProperty(this, "supportsMoleculeRendering", void 0);

    _defineProperty(this, "membraneAgent", void 0);

    _defineProperty(this, "resetCameraOnNewScene", void 0);

    _defineProperty(this, "lodBias", void 0);

    _defineProperty(this, "lodDistanceStops", void 0);

    _defineProperty(this, "needToCenterCamera", void 0);

    _defineProperty(this, "needToReOrientCamera", void 0);

    _defineProperty(this, "rotateDistance", void 0);

    _defineProperty(this, "initCameraPosition", void 0);

    _defineProperty(this, "fiberEndcaps", void 0);

    this.renderStyle = RenderStyle.GENERIC;
    this.supportsMoleculeRendering = false; // TODO: pass this flag in from the outside

    this.resetCameraOnNewScene = true;
    this.visGeomMap = new Map();
    this.meshRegistry = new Map();
    this.pdbRegistry = new Map();
    this.meshLoadAttempted = new Map();
    this.pdbLoadAttempted = new Map();
    this.scaleMapping = new Map();
    this.idColorMapping = new Map();
    this.followObjectId = NO_AGENT;
    this.visAgents = [];
    this.visAgentInstances = new Map();
    this.fixLightsToCamera = true;
    this.highlightedIds = [];
    this.hiddenIds = [];
    this.needToCenterCamera = false;
    this.needToReOrientCamera = false;
    this.rotateDistance = DEFAULT_CAMERA_Z_POSITION; // will store data for all agents that are drawing paths

    this.paths = [];
    this.fiberEndcaps = new _InstancedFiberEndcaps.default();
    this.fiberEndcaps.create(0);
    this.scene = new _three.Scene();
    this.lightsGroup = new _three.Group();
    this.agentMeshGroup = new _three.Group();
    this.agentFiberGroup = new _three.Group();
    this.agentPDBGroup = new _three.Group();
    this.agentPathGroup = new _three.Group();
    this.instancedMeshGroup = new _three.Group();
    this.setupScene();
    this.membraneAgent = undefined;
    this.moleculeRenderer = new _MoleculeRenderer.default();
    this.backgroundColor = DEFAULT_BACKGROUND_COLOR;
    this.pathEndColor = this.backgroundColor.clone();
    this.moleculeRenderer.setBackgroundColor(this.backgroundColor);
    this.mlogger = _jsLogger.default.get("visgeometry");
    this.mlogger.setLevel(loggerLevel);
    this.camera = new _three.PerspectiveCamera(75, 100 / 100, 0.1, 10000);
    this.initCameraPosition = this.camera.position.clone();
    this.dl = new _three.DirectionalLight(0xffffff, 0.6);
    this.hemiLight = new _three.HemisphereLight(0xffffff, 0x000000, 0.5);
    this.renderer = new _three.WebGLRenderer();
    this.controls = new _OrbitControls.OrbitControls(this.camera, this.renderer.domElement);
    this.boundingBox = new _three.Box3(new _three.Vector3(0, 0, 0), new _three.Vector3(100, 100, 100));
    this.boundingBoxMesh = new _three.Box3Helper(this.boundingBox, BOUNDING_BOX_COLOR);
    this.tickIntervalLength = 0;
    this.tickMarksMesh = new _three.LineSegments();
    this.boxNearZ = 0;
    this.boxFarZ = 100;
    this.currentSceneAgents = [];
    this.colorsData = new Float32Array(0);
    this.lodBias = 0;
    this.lodDistanceStops = [40, 100, 150, Number.MAX_VALUE];

    if (loggerLevel === _jsLogger.default.DEBUG) {
      this.setupGui();
    }

    this.raycaster = new _three.Raycaster();
  }

  _createClass(VisGeometry, [{
    key: "setBackgroundColor",
    value: function setBackgroundColor(c) {
      if (c === undefined) {
        this.backgroundColor = DEFAULT_BACKGROUND_COLOR.clone();
      } else {
        // convert from a PropColor to a THREE.Color
        this.backgroundColor = Array.isArray(c) ? new _three.Color(c[0], c[1], c[2]) : new _three.Color(c);
      }

      this.pathEndColor = this.backgroundColor.clone();
      this.moleculeRenderer.setBackgroundColor(this.backgroundColor);
      this.renderer.setClearColor(this.backgroundColor, 1);
    }
  }, {
    key: "setupGui",
    value: function setupGui() {
      var _this = this;

      var gui = new dat.GUI();
      var settings = {
        lodBias: this.lodBias,
        atomSpread: this.atomSpread,
        numAtoms: this.numAtomsPerAgent,
        bgcolor: {
          r: this.backgroundColor.r * 255,
          g: this.backgroundColor.g * 255,
          b: this.backgroundColor.b * 255
        }
      };
      gui.add(settings, "lodBias", 0, 4).step(1).onChange(function (value) {
        _this.lodBias = value;

        _this.updateScene(_this.currentSceneAgents);
      });
      gui.addColor(settings, "bgcolor").onChange(function (value) {
        _this.setBackgroundColor([value.r / 255.0, value.g / 255.0, value.b / 255.0]);
      });
      gui.add(settings, "atomSpread", 0.01, 8.0).onChange(function (value) {
        _this.atomSpread = value;

        _this.updateScene(_this.currentSceneAgents);
      });
      gui.add(settings, "numAtoms", 1, 400).step(1).onChange(function (value) {
        _this.numAtomsPerAgent = Math.floor(value);

        _this.updateScene(_this.currentSceneAgents);
      });
      this.moleculeRenderer.setupGui(gui);
    }
  }, {
    key: "setRenderStyle",
    value: function setRenderStyle(renderStyle) {
      // if target render style is supported, then change, otherwise don't.
      if (renderStyle === RenderStyle.MOLECULAR && !this.supportsMoleculeRendering) {
        console.log("Warning: molecule rendering not supported");
        return;
      }

      var changed = this.renderStyle !== renderStyle;
      this.renderStyle = renderStyle;

      if (changed) {
        this.constructInstancedFiberEndcaps();
      }

      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "constructInstancedFiberEndcaps",
    value: function constructInstancedFiberEndcaps() {
      // tell instanced geometry what representation to use.
      if (this.renderStyle === RenderStyle.GENERIC) {
        this.fiberEndcaps = new _InstancedFiberEndcapsFallback.default();
      } else {
        this.fiberEndcaps = new _InstancedFiberEndcaps.default();
      }

      this.fiberEndcaps.create(0);

      if (this.instancedMeshGroup.children.length > 0) {
        this.instancedMeshGroup.remove(this.instancedMeshGroup.children[0]);
      }

      if (_VisTypes.USE_INSTANCE_ENDCAPS) {
        this.instancedMeshGroup.add(this.fiberEndcaps.getMesh());
      }
    }
  }, {
    key: "handleTrajectoryData",
    value: function handleTrajectoryData(trajectoryData) {
      // get bounds.
      if (trajectoryData.hasOwnProperty("size")) {
        var bx = trajectoryData.size.x;
        var by = trajectoryData.size.y;
        var bz = trajectoryData.size.z;
        var epsilon = 0.000001;

        if (Math.abs(bx) < epsilon || Math.abs(by) < epsilon || Math.abs(bz) < epsilon) {
          console.log("WARNING: Bounding box: at least one bound is zero; using default bounds");
          this.resetBounds(DEFAULT_VOLUME_DIMENSIONS);
        } else {
          this.resetBounds([bx, by, bz]);
        }
      } else {
        this.resetBounds(DEFAULT_VOLUME_DIMENSIONS);
      }

      if (this.resetCameraOnNewScene) {
        this.resetCamera();
      }
    }
  }, {
    key: "resetCamera",
    value: function resetCamera() {
      this.followObjectId = NO_AGENT;
      this.controls.reset();
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
      this.rotateDistance = this.camera.position.distanceTo(new _three.Vector3());
    }
  }, {
    key: "zoomIn",
    value: function zoomIn() {
      var position = this.camera.position.clone();
      var target = this.controls.target.clone();
      var distance = position.distanceTo(target);
      var newDistance = distance - CAMERA_DOLLY_STEP_SIZE;
      var newPosition = new _three.Vector3().subVectors(position, target).setLength(newDistance);

      if (newDistance <= this.controls.minDistance) {
        return;
      }

      this.camera.position.copy(newPosition);
    }
  }, {
    key: "zoomOut",
    value: function zoomOut() {
      var position = this.camera.position.clone();
      var target = this.controls.target.clone();
      var distance = position.distanceTo(target);
      var newDistance = distance + CAMERA_DOLLY_STEP_SIZE;
      var newPosition = new _three.Vector3().subVectors(position, target).setLength(newDistance);

      if (newDistance >= this.controls.maxDistance) {
        return;
      }

      this.camera.position.copy(newPosition);
    }
  }, {
    key: "getFollowObject",
    value: function getFollowObject() {
      return this.followObjectId;
    }
  }, {
    key: "setFollowObject",
    value: function setFollowObject(obj) {
      if (this.membraneAgent && obj === this.membraneAgent.id) {
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
    key: "onNewRuntimeGeometryType",
    value: function onNewRuntimeGeometryType(meshName) {
      // find all typeIds for this meshName
      var typeIds = _toConsumableArray(this.visGeomMap.entries()).filter(function (_ref) {
        var v = _ref[1];
        return v.meshName === meshName;
      }).map(function (_ref2) {
        var _ref3 = _slicedToArray(_ref2, 1),
            k = _ref3[0];

        return k;
      }); // assuming the meshLoadRequest has already been added to the registry


      var meshLoadRequest = this.meshRegistry.get(meshName);

      if (meshLoadRequest === undefined) {
        console.error("Mesh name ".concat(meshName, " not found in mesh registry"));
        return;
      } // go over all objects and update mesh of this typeId
      // if this happens before the first updateScene, then the visAgents don't have type id's yet.


      var nMeshes = this.visAgents.length;

      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var visAgent = this.visAgents[i];

        if (typeIds.includes(visAgent.typeId)) {
          this.resetAgentGeometry(visAgent, meshLoadRequest.mesh);
          visAgent.setColor(this.getColorForTypeId(visAgent.typeId), this.getColorIndexForTypeId(visAgent.typeId));
        }
      }

      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "resetAgentGeometry",
    value: function resetAgentGeometry(visAgent, meshGeom) {
      this.agentMeshGroup.remove(visAgent.mesh);
      this.agentFiberGroup.remove(visAgent.mesh);
      visAgent.setupMeshGeometry(meshGeom);

      if (visAgent.visType === _VisTypes.default.ID_VIS_TYPE_DEFAULT) {
        this.agentMeshGroup.add(visAgent.mesh);
      } else if (visAgent.visType === _VisTypes.default.ID_VIS_TYPE_FIBER) {
        this.agentFiberGroup.add(visAgent.mesh);
      }
    }
  }, {
    key: "onNewPdb",
    value: function onNewPdb(pdbName) {
      // find all typeIds for this meshName
      var typeIds = _toConsumableArray(this.visGeomMap.entries()).filter(function (_ref4) {
        var v = _ref4[1];
        return v.pdbName === pdbName;
      }).map(function (_ref5) {
        var _ref6 = _slicedToArray(_ref5, 1),
            k = _ref6[0];

        return k;
      }); // assuming the pdb has already been added to the registry


      var pdb = this.pdbRegistry.get(pdbName); // go over all objects and update mesh of this typeId
      // if this happens before the first updateScene, then the visAgents don't have type id's yet.

      var nMeshes = this.visAgents.length;

      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var visAgent = this.visAgents[i];

        if (typeIds.includes(visAgent.typeId)) {
          this.resetAgentPDB(visAgent, pdb);
          visAgent.setColor(this.getColorForTypeId(visAgent.typeId), this.getColorIndexForTypeId(visAgent.typeId));
        }
      }

      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "resetAgentPDB",
    value: function resetAgentPDB(visAgent, pdb) {
      for (var lod = 0; lod < visAgent.pdbObjects.length; ++lod) {
        this.agentPDBGroup.remove(visAgent.pdbObjects[lod]);
      }

      visAgent.setupPdb(pdb);

      for (var _lod = 0; _lod < visAgent.pdbObjects.length; ++_lod) {
        this.agentPDBGroup.add(visAgent.pdbObjects[_lod]);
      }
    }
  }, {
    key: "setUpControls",
    value: function setUpControls(element) {
      this.controls = new _OrbitControls.OrbitControls(this.camera, element);
      this.controls.maxDistance = 750;
      this.controls.minDistance = 5;
      this.controls.zoomSpeed = 1.0;
      this.controls.enablePan = false;
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
      this.scene = new _three.Scene();
      this.lightsGroup = new _three.Group();
      this.lightsGroup.name = "lights";
      this.scene.add(this.lightsGroup);
      this.agentMeshGroup = new _three.Group();
      this.agentMeshGroup.name = "agent meshes";
      this.scene.add(this.agentMeshGroup);
      this.agentFiberGroup = new _three.Group();
      this.agentFiberGroup.name = "agent fibers";
      this.scene.add(this.agentFiberGroup);
      this.agentPDBGroup = new _three.Group();
      this.agentPDBGroup.name = "agent pdbs";
      this.scene.add(this.agentPDBGroup);
      this.agentPathGroup = new _three.Group();
      this.agentPathGroup.name = "agent paths";
      this.scene.add(this.agentPathGroup);
      this.instancedMeshGroup = new _three.Group();
      this.instancedMeshGroup.name = "instanced meshes for agents";
      this.scene.add(this.instancedMeshGroup);
      this.camera = new _three.PerspectiveCamera(75, initWidth / initHeight, 0.1, 1000);
      this.resetBounds(DEFAULT_VOLUME_DIMENSIONS);
      this.dl = new _three.DirectionalLight(0xffffff, 0.6);
      this.dl.position.set(0, 0, 1);
      this.lightsGroup.add(this.dl);
      this.hemiLight = new _three.HemisphereLight(0xffffff, 0x000000, 0.5);
      this.hemiLight.color.setHSL(0.095, 1, 0.75);
      this.hemiLight.groundColor.setHSL(0.6, 1, 0.6);
      this.hemiLight.position.set(0, 1, 0);
      this.lightsGroup.add(this.hemiLight);

      if (_WebGL.WEBGL.isWebGL2Available() === false) {
        this.renderStyle = RenderStyle.GENERIC;
        this.supportsMoleculeRendering = false;
        this.renderer = new _three.WebGLRenderer();
      } else {
        this.renderStyle = RenderStyle.MOLECULAR;
        this.supportsMoleculeRendering = true;
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("webgl2", {
          alpha: false
        });
        var rendererParams = {
          canvas: canvas,
          context: context
        };
        this.renderer = new _three.WebGLRenderer(rendererParams);
      } // set this up after the renderStyle has been set.


      this.constructInstancedFiberEndcaps();
      this.renderer.setSize(initWidth, initHeight); // expected to change when reparented

      this.renderer.setClearColor(this.backgroundColor, 1);
      this.renderer.clear();
      this.camera.position.z = DEFAULT_CAMERA_Z_POSITION;
      this.initCameraPosition = this.camera.position.clone();
    }
  }, {
    key: "loadPdb",
    value: function loadPdb(pdbName, assetPath) {
      var _this2 = this;

      var pdbmodel = new _PDBModel.default(pdbName);
      this.pdbRegistry.set(pdbName, pdbmodel);
      pdbmodel.download("".concat(assetPath, "/").concat(pdbName)).then(function () {
        var pdbEntry = _this2.pdbRegistry.get(pdbName);

        if (pdbEntry && pdbEntry === pdbmodel && !pdbEntry.isCancelled()) {
          _this2.logger.debug("Finished loading pdb: ", pdbName);

          _this2.onNewPdb(pdbName); // initiate async LOD processing


          pdbmodel.generateLOD().then(function () {
            _this2.logger.debug("Finished loading pdb LODs: ", pdbName);

            _this2.onNewPdb(pdbName);
          });
        }
      }, function (reason) {
        _this2.pdbRegistry.delete(pdbName);

        if (reason !== _TaskQueue.REASON_CANCELLED) {
          console.error(reason);

          _this2.logger.debug("Failed to load pdb: ", pdbName);
        }
      });
    }
  }, {
    key: "loadObj",
    value: function loadObj(meshName, assetPath) {
      var _this3 = this;

      var objLoader = new _OBJLoader.OBJLoader();
      this.meshRegistry.set(meshName, {
        mesh: new _three.Mesh(_VisAgent.default.sphereGeometry),
        cancelled: false
      });
      objLoader.load("".concat(assetPath, "/").concat(meshName), function (object) {
        var meshLoadRequest = _this3.meshRegistry.get(meshName);

        if (meshLoadRequest && meshLoadRequest.cancelled || !meshLoadRequest) {
          _this3.meshRegistry.delete(meshName);

          return;
        }

        _this3.logger.debug("Finished loading mesh: ", meshName); // insert new mesh into meshRegistry


        _this3.meshRegistry.set(meshName, {
          mesh: object,
          cancelled: false
        });

        if (!object.name) {
          object.name = meshName;
        }

        _this3.onNewRuntimeGeometryType(meshName);
      }, function (xhr) {
        _this3.logger.debug(meshName, " ", "".concat(xhr.loaded / xhr.total * 100, "% loaded"));
      }, function (error) {
        _this3.meshRegistry.delete(meshName);

        console.error(error);

        _this3.logger.debug("Failed to load mesh: ", error, meshName);
      });
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      // at least 2x2 in size when resizing, to prevent bad buffer sizes
      width = Math.max(width, 2);
      height = Math.max(height, 2);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.moleculeRenderer.resize(width, height);
    }
  }, {
    key: "reparent",
    value: function reparent(parent) {
      var _this4 = this;

      if (parent === undefined || parent == null) {
        return;
      }

      parent.appendChild(this.renderer.domElement);
      this.setUpControls(this.renderer.domElement);
      this.resize(parent.scrollWidth, parent.scrollHeight);
      this.renderer.setClearColor(this.backgroundColor, 1.0);
      this.renderer.clear();
      this.renderer.domElement.setAttribute("style", "top: 0px; left: 0px");

      this.renderer.domElement.onmouseenter = function () {
        return _this4.enableControls();
      };

      this.renderer.domElement.onmouseleave = function () {
        return _this4.disableControls();
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
    key: "render",
    value: function render(time) {
      if (this.visAgents.length === 0) {
        this.renderer.clear();
        return;
      }

      var elapsedSeconds = time / 1000;

      if (this.membraneAgent) {
        _VisAgent.default.updateMembrane(elapsedSeconds, this.renderer);
      }

      this.controls.update();
      this.animateCamera();
      this.camera.updateMatrixWorld();
      this.transformBoundingBox(); // update light sources due to camera moves

      if (this.dl && this.fixLightsToCamera) {
        // position directional light at camera (facing scene, as headlight!)
        this.dl.position.setFromMatrixColumn(this.camera.matrixWorld, 2);
      }

      if (this.hemiLight && this.fixLightsToCamera) {
        // make hemi light come down from vertical of screen (camera up)
        this.hemiLight.position.setFromMatrixColumn(this.camera.matrixWorld, 1);
      }

      if (this.instancedMeshGroup.children.length > 0) {
        this.instancedMeshGroup.remove(this.instancedMeshGroup.children[0]);
      }

      this.instancedMeshGroup.add(this.fiberEndcaps.getMesh());

      if (this.renderStyle === RenderStyle.GENERIC) {
        // meshes only.
        this.renderer.render(this.scene, this.camera);
      } else {
        // select visibility and representation.
        // and set lod for pdbs.
        for (var i = 0; i < this.visAgents.length; ++i) {
          var agent = this.visAgents[i];

          if (agent.active) {
            if (agent.hidden) {
              agent.hide();
            } else if (agent.hasDrawablePDB()) {
              var agentDistance = this.camera.position.distanceTo(agent.mesh.position);
              agent.renderAsPDB(agentDistance, this.lodDistanceStops, this.lodBias);
            } else {
              agent.renderAsMesh();
            }
          }
        }

        this.scene.updateMatrixWorld();
        this.scene.autoUpdate = false;
        this.moleculeRenderer.setMeshGroups(this.agentMeshGroup, this.agentPDBGroup, this.agentFiberGroup, this.instancedMeshGroup);
        this.moleculeRenderer.setFollowedInstance(this.followObjectId);
        this.moleculeRenderer.setNearFar(this.boxNearZ, this.boxFarZ);
        this.boundingBoxMesh.visible = false;
        this.tickMarksMesh.visible = false;
        this.agentPathGroup.visible = false;
        this.moleculeRenderer.render(this.renderer, this.scene, this.camera, null); // final pass, add extra stuff on top: bounding box and line paths

        this.boundingBoxMesh.visible = true;
        this.tickMarksMesh.visible = true;
        this.agentPathGroup.visible = true;
        this.renderer.autoClear = false; // hide everything except the wireframe and paths, and render with the standard renderer

        this.agentMeshGroup.visible = false;
        this.agentFiberGroup.visible = false;
        this.agentPDBGroup.visible = false;
        this.instancedMeshGroup.visible = false;
        this.renderer.render(this.scene, this.camera);
        this.agentMeshGroup.visible = true;
        this.agentFiberGroup.visible = true;
        this.agentPDBGroup.visible = true;
        this.instancedMeshGroup.visible = true;
        this.renderer.autoClear = true;
        this.scene.autoUpdate = true;
      }
    }
  }, {
    key: "transformBoundingBox",
    value: function transformBoundingBox() {
      // bounds are in world space
      var box = new _three.Box3().copy(this.boundingBox); // world to camera space

      box.applyMatrix4(this.camera.matrixWorldInverse); // camera is pointing along negative Z.  so invert for positive distances

      this.boxNearZ = -box.max.z;
      this.boxFarZ = -box.min.z; // compare with CompositePass float eyeDepth = -col0.z; to use a positive distance value.
    }
  }, {
    key: "hitTest",
    value: function hitTest(offsetX, offsetY) {
      var size = new _three.Vector2();
      this.renderer.getSize(size);

      if (this.renderStyle === RenderStyle.GENERIC) {
        var mouse = {
          x: offsetX / size.x * 2 - 1,
          y: -(offsetY / size.y) * 2 + 1
        };
        this.raycaster.setFromCamera(mouse, this.camera); // intersect the agent mesh group.

        var intersects = this.raycaster.intersectObjects(this.agentMeshGroup.children, true); // try fibers next

        if (!intersects.length) {
          intersects = this.raycaster.intersectObjects(this.agentFiberGroup.children, true);
        }

        if (intersects && intersects.length) {
          var obj = intersects[0].object; // if the object has a parent and the parent is not the scene, use that.
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
        return this.moleculeRenderer.hitTest(this.renderer, offsetX, size.y - offsetY);
      }
    }
    /**
     *   Run Time Mesh functions
     */

  }, {
    key: "createMaterials",
    value: function createMaterials(colors) {
      var _this5 = this;

      // convert any #FFFFFF -> 0xFFFFFF
      var colorNumbers = colors.map(function (color) {
        return parseInt(color.toString().replace(/^#/, "0x"), 16);
      });
      var numColors = colors.length; // fill buffer of colors:

      this.colorsData = new Float32Array(numColors * 4);

      for (var i = 0; i < numColors; i += 1) {
        // each color is currently a hex value:
        this.colorsData[i * 4 + 0] = ((colorNumbers[i] & 0x00ff0000) >> 16) / 255.0;
        this.colorsData[i * 4 + 1] = ((colorNumbers[i] & 0x0000ff00) >> 8) / 255.0;
        this.colorsData[i * 4 + 2] = ((colorNumbers[i] & 0x000000ff) >> 0) / 255.0;
        this.colorsData[i * 4 + 3] = 1.0;
      }

      this.moleculeRenderer.updateColors(numColors, this.colorsData);
      this.visAgents.forEach(function (agent) {
        agent.setColor(_this5.getColorForTypeId(agent.typeId), _this5.getColorIndexForTypeId(agent.typeId));
      });
    }
  }, {
    key: "clearColorMapping",
    value: function clearColorMapping() {
      this.idColorMapping.clear();
    }
  }, {
    key: "getColorIndexForTypeId",
    value: function getColorIndexForTypeId(typeId) {
      var index = this.idColorMapping.get(typeId);

      if (index === undefined) {
        console.log("getColorIndexForTypeId could not find " + typeId);
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
    key: "setColorForIds",
    value: function setColorForIds(ids, colorId) {
      var _this6 = this;

      ids.forEach(function (id) {
        _this6.idColorMapping.set(id, colorId);
      });
    }
  }, {
    key: "getColorForIndex",
    value: function getColorForIndex(index) {
      return new _three.Color(this.colorsData[index * 4], this.colorsData[index * 4 + 1], this.colorsData[index * 4 + 2]);
    }
    /**
     *   Data Management
     */

  }, {
    key: "resetMapping",
    value: function resetMapping() {
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

  }, {
    key: "mapIdToGeom",
    value: function mapIdToGeom(id, meshName, pdbName, assetPath) {
      this.logger.debug("Mesh for id ", id, " set to ", meshName);
      this.logger.debug("PDB for id ", id, " set to ", pdbName);
      var unassignedName = "".concat(_VisAgent.default.UNASSIGNED_NAME_PREFIX, "-").concat(id);
      this.visGeomMap.set(id, {
        meshName: meshName || unassignedName,
        pdbName: pdbName || unassignedName
      });

      if (meshName && !this.meshRegistry.has(meshName) && !this.meshLoadAttempted.get(meshName)) {
        this.loadObj(meshName, assetPath);
        this.meshLoadAttempted.set(meshName, true);
      } else if (!this.meshRegistry.has(unassignedName)) {
        // assign mesh sphere
        this.meshRegistry.set(unassignedName, {
          mesh: new _three.Mesh(_VisAgent.default.sphereGeometry),
          cancelled: false
        });
        this.onNewRuntimeGeometryType(unassignedName);
      } // try load pdb file also.


      if (pdbName && !this.pdbRegistry.has(pdbName) && !this.pdbLoadAttempted.get(pdbName)) {
        this.loadPdb(pdbName, assetPath);
        this.pdbLoadAttempted.set(pdbName, true);
      } else if (!this.pdbRegistry.has(unassignedName)) {
        // assign single atom pdb
        var pdbmodel = new _PDBModel.default(unassignedName);
        pdbmodel.create(1);
        this.pdbRegistry.set(unassignedName, pdbmodel);
      }
    }
  }, {
    key: "getGeomFromId",
    value: function getGeomFromId(id) {
      if (this.visGeomMap.has(id)) {
        var entry = this.visGeomMap.get(id);

        if (entry) {
          var meshName = entry.meshName;

          if (meshName && this.meshRegistry.has(meshName)) {
            var meshLoadRequest = this.meshRegistry.get(meshName);

            if (meshLoadRequest) {
              return meshLoadRequest.mesh;
            }
          }
        }
      }

      return null;
    }
  }, {
    key: "getPdbFromId",
    value: function getPdbFromId(id) {
      if (this.visGeomMap.has(id)) {
        var entry = this.visGeomMap.get(id);

        if (entry) {
          var pdbName = entry.pdbName;

          if (pdbName && this.pdbRegistry.has(pdbName)) {
            var pdb = this.pdbRegistry.get(pdbName);

            if (pdb) {
              return pdb;
            }
          }
        }
      }

      return null;
    }
  }, {
    key: "mapFromJSON",
    value: function mapFromJSON(name, filePath, assetPath, callback) {
      var _this7 = this;

      if (!filePath) {
        return Promise.resolve();
      }

      var jsonRequest = new Request(filePath);
      return fetch(jsonRequest).then(function (response) {
        if (!response.ok) {
          return Promise.reject(response);
        }

        return response.json();
      }).catch(function (response) {
        if (response.status === 404) {
          console.warn("Could not fetch geometry info for ".concat(name, " because ").concat(filePath, " does not exist."));
        } else {
          console.error("Could not fetch geometry info for ".concat(name, ": ").concat(response.statusText));
        }
      }).then(function (data) {
        if (data) {
          _this7.setGeometryData(data, assetPath, callback);
        }
      });
    }
  }, {
    key: "setGeometryData",
    value: function setGeometryData(jsonData, assetPath, callback) {
      var _this8 = this;

      // clear things out in advance of loading all new geometry
      this.resetMapping();
      this.logger.debug("JSON Mesh mapping loaded: ", jsonData);
      Object.keys(jsonData).forEach(function (id) {
        var entry = jsonData[id];

        if (id === "size") {
          console.log("WARNING: Ignoring deprecated bounding box data");
        } else {
          // mesh name is entry.mesh
          // pdb name is entry.pdb
          _this8.mapIdToGeom(Number(id), entry.mesh, entry.pdb, assetPath);

          _this8.setScaleForId(Number(id), entry.scale);
        }
      });

      if (callback) {
        callback(jsonData);
      }
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
      var lineGeometry = new _three.BufferGeometry();
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
      lineGeometry.setAttribute("position", new _three.BufferAttribute(vertices, 3));
      var lineMaterial = new _three.LineBasicMaterial({
        color: BOUNDING_BOX_COLOR
      });
      this.tickMarksMesh = new _three.LineSegments(lineGeometry, lineMaterial);
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
      this.boundingBox = new _three.Box3(new _three.Vector3(minX, minY, minZ), new _three.Vector3(maxX, maxY, maxZ));
      this.boundingBoxMesh = new _three.Box3Helper(this.boundingBox, BOUNDING_BOX_COLOR);
      this.boundingBoxMesh.visible = visible;
    }
  }, {
    key: "resetBounds",
    value: function resetBounds(volumeDimensions) {
      this.scene.remove(this.boundingBoxMesh, this.tickMarksMesh);

      if (!volumeDimensions) {
        console.log("invalid volume dimensions received");
        return;
      }

      var _volumeDimensions = _slicedToArray(volumeDimensions, 3),
          bx = _volumeDimensions[0],
          by = _volumeDimensions[1],
          bz = _volumeDimensions[2];

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
      var agent = new _VisAgent.default("Agent_".concat(i));
      this.visAgents.push(agent);
      return agent;
    }
    /**
     *   Update Scene
     **/

  }, {
    key: "updateScene",
    value: function updateScene(agents) {
      var _this9 = this;

      this.currentSceneAgents = agents;
      var dx = 0,
          dy = 0,
          dz = 0;
      var lastx = 0,
          lasty = 0,
          lastz = 0;

      if (_VisTypes.USE_INSTANCE_ENDCAPS) {
        this.fiberEndcaps.beginUpdate(agents.length);
      } // mark ALL inactive and invisible


      for (var i = 0; i < MAX_MESHES && i < this.visAgents.length; i += 1) {
        var visAgent = this.visAgents[i];
        visAgent.hideAndDeactivate();
      }

      agents.forEach(function (agentData) {
        var visType = agentData["vis-type"];
        var instanceId = agentData.instanceId;
        var typeId = agentData.type;

        var scale = _this9.getScaleForId(typeId);

        var radius = agentData.cr ? agentData.cr : 1;
        lastx = agentData.x;
        lasty = agentData.y;
        lastz = agentData.z;

        var visAgent = _this9.visAgentInstances.get(instanceId);

        var path = _this9.findPathForAgent(instanceId);

        if (path) {
          // look up last agent with this instanceId.
          if (visAgent && visAgent.mesh) {
            lastx = visAgent.mesh.position.x;
            lasty = visAgent.mesh.position.y;
            lastz = visAgent.mesh.position.z;
          }
        }

        if (!visAgent) {
          visAgent = _this9.createAgent();

          _this9.visAgentInstances.set(instanceId, visAgent);
        }

        visAgent.id = instanceId;
        visAgent.mesh.userData = {
          id: instanceId
        };
        var lastTypeId = visAgent.typeId;
        visAgent.typeId = typeId;
        visAgent.active = true;
        var wasHidden = visAgent.hidden;

        var isHidden = _this9.hiddenIds.includes(visAgent.typeId);

        visAgent.setHidden(isHidden);

        if (visAgent.hidden) {
          visAgent.hide();
          return;
        }

        var isHighlighted = _this9.highlightedIds.includes(visAgent.typeId);

        visAgent.setHighlighted(isHighlighted); // if not fiber...

        if (visType === _VisTypes.default.ID_VIS_TYPE_DEFAULT) {
          // did the agent type change since the last sim time?
          if (wasHidden || typeId !== lastTypeId || visType !== visAgent.visType) {
            var meshGeom = _this9.getGeomFromId(typeId);

            visAgent.visType = visType;

            if (meshGeom) {
              _this9.resetAgentGeometry(visAgent, meshGeom);

              if (meshGeom.name.includes("membrane")) {
                _this9.membraneAgent = visAgent;
              }
            }

            var pdbGeom = _this9.getPdbFromId(typeId);

            if (pdbGeom) {
              _this9.resetAgentPDB(visAgent, pdbGeom);
            }

            if (!pdbGeom && !meshGeom) {
              _this9.resetAgentGeometry(visAgent, new _three.Mesh(_VisAgent.default.sphereGeometry));
            }

            visAgent.setColor(_this9.getColorForTypeId(typeId), _this9.getColorIndexForTypeId(typeId));
          }

          var runtimeMesh = visAgent.mesh;
          dx = agentData.x - lastx;
          dy = agentData.y - lasty;
          dz = agentData.z - lastz;
          runtimeMesh.position.x = agentData.x;
          runtimeMesh.position.y = agentData.y;
          runtimeMesh.position.z = agentData.z;
          runtimeMesh.rotation.x = agentData.xrot;
          runtimeMesh.rotation.y = agentData.yrot;
          runtimeMesh.rotation.z = agentData.zrot;
          runtimeMesh.visible = true;
          runtimeMesh.scale.x = radius * scale;
          runtimeMesh.scale.y = radius * scale;
          runtimeMesh.scale.z = radius * scale; // update pdb transforms too

          var pdb = visAgent.pdbModel;

          if (pdb && pdb.pdb) {
            for (var lod = 0; lod < visAgent.pdbObjects.length; ++lod) {
              var obj = visAgent.pdbObjects[lod];
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

          if (path && path.line) {
            _this9.addPointToPath(path, agentData.x, agentData.y, agentData.z, dx, dy, dz);
          }
        } else if (visType === _VisTypes.default.ID_VIS_TYPE_FIBER) {
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
          } // see if we need to initialize this agent as a fiber


          if (visType !== visAgent.visType) {
            var _meshGeom = _VisAgent.default.makeFiber();

            if (_meshGeom) {
              _meshGeom.userData = {
                id: visAgent.id
              };
              _meshGeom.name = "Fiber_".concat(instanceId);
              visAgent.visType = visType;

              _this9.resetAgentGeometry(visAgent, _meshGeom);

              visAgent.setColor(_this9.getColorForTypeId(typeId), _this9.getColorIndexForTypeId(typeId));
            }
          } // did the agent type change since the last sim time?


          if (wasHidden || typeId !== lastTypeId) {
            visAgent.mesh.userData = {
              id: visAgent.id
            }; // for fibers we currently only check the color

            visAgent.setColor(_this9.getColorForTypeId(typeId), _this9.getColorIndexForTypeId(typeId));
          }

          visAgent.updateFiber(agentData.subpoints, agentData.cr, scale);
          visAgent.mesh.visible = true;

          if (_VisTypes.USE_INSTANCE_ENDCAPS) {
            var q = new _three.Quaternion().setFromEuler(visAgent.mesh.rotation);

            var c = _this9.getColorForTypeId(typeId);

            _this9.fiberEndcaps.addInstance(agentData.subpoints[0] + visAgent.mesh.position.x, agentData.subpoints[1] + visAgent.mesh.position.y, agentData.subpoints[2] + visAgent.mesh.position.z, agentData.cr * scale * 0.5, q.x, q.y, q.z, q.w, visAgent.id, visAgent.signedTypeId(), c);

            _this9.fiberEndcaps.addInstance(agentData.subpoints[agentData.subpoints.length - 3] + visAgent.mesh.position.x, agentData.subpoints[agentData.subpoints.length - 2] + visAgent.mesh.position.y, agentData.subpoints[agentData.subpoints.length - 1] + visAgent.mesh.position.z, agentData.cr * scale * 0.5, q.x, q.y, q.z, q.w, visAgent.id, visAgent.signedTypeId(), c);
          }
        }
      });

      if (_VisTypes.USE_INSTANCE_ENDCAPS) {
        this.fiberEndcaps.endUpdate();
      }
    }
  }, {
    key: "animateCamera",
    value: function animateCamera() {
      var lerpTarget = true;
      var lerpPosition = true;
      var lerpRate = 0.2;
      var distanceBuffer = 0.002;
      var rotationBuffer = 0.01;

      if (this.followObjectId !== NO_AGENT) {
        // keep camera at same distance from target.
        var direction = new _three.Vector3().subVectors(this.camera.position, this.controls.target);
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


        var newPosition = new _three.Vector3();
        newPosition.subVectors(newTarget, direction.multiplyScalar(-distance));

        if (lerpPosition) {
          this.camera.position.lerp(newPosition, lerpRate);
        } else {
          this.camera.position.copy(newPosition);
        }
      } else if (this.needToCenterCamera) {
        this.controls.target.lerp(new _three.Vector3(), lerpRate);

        if (this.controls.target.distanceTo(new _three.Vector3()) < distanceBuffer) {
          this.controls.target.copy(new _three.Vector3());
          this.needToCenterCamera = false;
        }
      } else if (this.needToReOrientCamera) {
        this.controls.target.copy(new _three.Vector3());
        var position = this.camera.position;
        var curDistanceFromCenter = this.rotateDistance;
        var targetPosition = this.initCameraPosition.clone().setLength(curDistanceFromCenter);
        var currentPosition = position.clone();
        var targetQuat = new _three.Quaternion().setFromAxisAngle(targetPosition, 0);
        var currentQuat = new _three.Quaternion().copy(this.camera.quaternion);
        var totalAngle = currentQuat.angleTo(targetQuat);
        var newAngle = lerpRate * totalAngle; // gives same value as using quanternion.slerp

        var normal = currentPosition.clone().cross(targetPosition).normalize();
        this.camera.position.applyAxisAngle(normal, newAngle);
        this.camera.lookAt(new _three.Vector3()); // it doesnt seem to be able to get to zero, but this was small enough to look good

        if (this.camera.position.angleTo(targetPosition) < rotationBuffer) {
          this.needToReOrientCamera = false;
        }
      }
    }
  }, {
    key: "findPathForAgent",
    value: function findPathForAgent(id) {
      var path = this.paths.find(function (path) {
        return path.agentId === id;
      });

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
        var agent = this.visAgentInstances.get(id);

        if (agent) {
          color = agent.color.clone();
        } else {
          console.error("COULD NOT FIND AGENT INSTANCE " + id);
        }
      }

      var pointsArray = new Float32Array(maxSegments * 3 * 2);
      var colorsArray = new Float32Array(maxSegments * 3 * 2);
      var lineGeometry = new _three.BufferGeometry();
      lineGeometry.setAttribute("position", new _three.BufferAttribute(pointsArray, 3));
      lineGeometry.setAttribute("color", new _three.BufferAttribute(colorsArray, 3)); // path starts empty: draw range spans nothing

      lineGeometry.setDrawRange(0, 0); // the line will be colored per-vertex

      var lineMaterial = new _three.LineBasicMaterial({
        vertexColors: true
      });
      var lineObject = new _three.LineSegments(lineGeometry, lineMaterial);
      lineObject.frustumCulled = false;
      var pathdata = {
        agentId: id,
        numSegments: 0,
        maxSegments: maxSegments,
        color: color || new _three.Color(0xffffff),
        points: pointsArray,
        colors: colorsArray,
        geometry: lineGeometry,
        material: lineMaterial,
        line: lineObject
      };
      this.agentPathGroup.add(pathdata.line);
      this.paths.push(pathdata);
      return pathdata;
    }
  }, {
    key: "removePathForAgent",
    value: function removePathForAgent(id) {
      var pathindex = this.paths.findIndex(function (path) {
        return path.agentId === id;
      });

      if (pathindex === -1) {
        console.log("attempted to remove path for agent " + id + " that doesn't exist.");
        return;
      }

      this.removeOnePath(pathindex);
    }
  }, {
    key: "removeOnePath",
    value: function removeOnePath(pathindex) {
      var path = this.paths[pathindex];
      this.agentPathGroup.remove(path.line);
      this.paths.splice(pathindex, 1);
    }
  }, {
    key: "removeAllPaths",
    value: function removeAllPaths() {
      while (this.paths.length > 0) {
        this.removeOnePath(0);
      }
    }
  }, {
    key: "addPointToPath",
    value: function addPointToPath(path, x, y, z, dx, dy, dz) {
      if (x === dx && y === dy && z === dz) {
        return;
      } // Check for periodic boundary condition:
      // if any agent moved more than half the volume size in one step,
      // assume it jumped the boundary going the other way.


      var volumeSize = new _three.Vector3();
      this.boundingBox.getSize(volumeSize);

      if (Math.abs(dx) > volumeSize.x / 2 || Math.abs(dy) > volumeSize.y / 2 || Math.abs(dz) > volumeSize.z / 2) {
        // now what?
        // TODO: clip line segment from x-dx to x against the bounds,
        // compute new line segments from x-dx to bound, and from x to opposite bound
        // For now, add a degenerate line segment
        dx = 0;
        dy = 0;
        dz = 0;
      } // check for paths at max length


      if (path.numSegments === path.maxSegments) {
        // because we append to the end, we can copyWithin to move points up to the beginning
        // as a means of removing the first point in the path.
        // shift the points:
        path.points.copyWithin(0, 3 * 2, path.maxSegments * 3 * 2);
        path.numSegments = path.maxSegments - 1;
      } else {
        // rewrite all the colors. this might be prohibitive for lots of long paths.
        for (var ic = 0; ic < path.numSegments + 1; ++ic) {
          // the very first point should be a=1
          var a = 1.0 - ic / (path.numSegments + 1);
          path.colors[ic * 6 + 0] = lerp(path.color.r, this.pathEndColor.r, a);
          path.colors[ic * 6 + 1] = lerp(path.color.g, this.pathEndColor.g, a);
          path.colors[ic * 6 + 2] = lerp(path.color.b, this.pathEndColor.b, a); // the very last point should be b=0

          var b = 1.0 - (ic + 1) / (path.numSegments + 1);
          path.colors[ic * 6 + 3] = lerp(path.color.r, this.pathEndColor.r, b);
          path.colors[ic * 6 + 4] = lerp(path.color.g, this.pathEndColor.g, b);
          path.colors[ic * 6 + 5] = lerp(path.color.b, this.pathEndColor.b, b);
        }

        path.line.geometry.attributes.color.needsUpdate = true;
      } // add a segment to this line


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
  }, {
    key: "setShowPaths",
    value: function setShowPaths(showPaths) {
      for (var i = 0; i < this.paths.length; ++i) {
        var line = this.paths[i].line;

        if (line) {
          line.visible = showPaths;
        }
      }
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
        if (path.line) {
          path.line.visible = visible;
        }
      }
    }
  }, {
    key: "clearForNewTrajectory",
    value: function clearForNewTrajectory() {
      this.resetMapping(); // remove current scene agents.

      this.visAgentInstances.clear();
      this.visAgents = [];
      this.currentSceneAgents = [];
      this.dehighlight();
    }
  }, {
    key: "cancelAllAsyncProcessing",
    value: function cancelAllAsyncProcessing() {
      // note that this leaves cancelled things in the registries.
      // This should be called before the registries are cleared and probably
      // only makes sense to do if they are indeed about to be cleared.
      // don't process any queued requests
      _TaskQueue.default.stopAll(); // signal to cancel any pending pdbs


      this.pdbRegistry.forEach(function (value) {
        value.setCancelled();
      }); // signal to cancel any pending mesh downloads

      this.meshRegistry.forEach(function (value) {
        value.cancelled = true;
      });
    }
  }, {
    key: "resetAllGeometry",
    value: function resetAllGeometry() {
      this.cancelAllAsyncProcessing();
      this.unfollow();
      this.removeAllPaths();
      this.membraneAgent = undefined; // remove geometry from all visible scene groups.
      // Object3D.remove can be slow, and just doing it in-order here
      // is faster than doing it in the loop over all visAgents

      for (var i = this.agentMeshGroup.children.length - 1; i >= 0; i--) {
        this.agentMeshGroup.remove(this.agentMeshGroup.children[i]);
      }

      for (var _i2 = this.agentFiberGroup.children.length - 1; _i2 >= 0; _i2--) {
        this.agentFiberGroup.remove(this.agentFiberGroup.children[_i2]);
      }

      for (var _i3 = this.agentPDBGroup.children.length - 1; _i3 >= 0; _i3--) {
        this.agentPDBGroup.remove(this.agentPDBGroup.children[_i3]);
      }

      for (var _i4 = this.instancedMeshGroup.children.length - 1; _i4 >= 0; _i4--) {
        this.instancedMeshGroup.remove(this.instancedMeshGroup.children[_i4]);
      } // recreate an empty set of fiber endcaps to clear out the old ones.


      this.constructInstancedFiberEndcaps(); // set all runtime meshes back to spheres.

      var _iterator = _createForOfIteratorHelper(this.visAgentInstances.values()),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var visAgent = _step.value;
          visAgent.resetMesh();
          visAgent.resetPDB();
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }, {
    key: "update",
    value: function update(agents) {
      this.updateScene(agents);
    }
  }, {
    key: "logger",
    get: function get() {
      return this.mlogger;
    }
  }, {
    key: "renderDom",
    get: function get() {
      return this.renderer.domElement;
    }
  }]);

  return VisGeometry;
}();

exports.VisGeometry = VisGeometry;
var _default = VisGeometry;
exports.default = _default;