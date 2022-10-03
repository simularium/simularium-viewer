function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import { WEBGL } from "three/examples/jsm/WebGL.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Box3, Box3Helper, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DirectionalLight, Group, HemisphereLight, LineBasicMaterial, LineCurve3, LineSegments, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, Raycaster, Scene, SphereBufferGeometry, TubeBufferGeometry, Vector2, Vector3, VertexColors, WebGLRenderer } from "three";
import * as dat from "dat.gui";
import jsLogger from "js-logger";
import MembraneShader from "./rendering/MembraneShader";
import MoleculeRenderer from "./rendering/MoleculeRenderer";
var MAX_PATH_LEN = 32;
var MAX_MESHES = 20000;
var DEFAULT_BACKGROUND_COLOR = new Color(0.121569, 0.13333, 0.17647);
var DEFAULT_VOLUME_BOUNDS = [-150, -150, -150, 150, 150, 150];
var BOUNDING_BOX_COLOR = new Color(0x6e6e6e);
var NO_AGENT = -1;
var RenderStyle;

(function (RenderStyle) {
  RenderStyle[RenderStyle["GENERIC"] = 0] = "GENERIC";
  RenderStyle[RenderStyle["MOLECULAR"] = 1] = "MOLECULAR";
})(RenderStyle || (RenderStyle = {}));

function lerp(x0, x1, alpha) {
  return x0 + (x1 - x0) * alpha;
}

var VisGeometry =
/*#__PURE__*/
function () {
  function VisGeometry(loggerLevel) {
    _classCallCheck(this, VisGeometry);

    _defineProperty(this, "renderStyle", void 0);

    _defineProperty(this, "backgroundColor", void 0);

    _defineProperty(this, "pathEndColor", void 0);

    _defineProperty(this, "visGeomMap", void 0);

    _defineProperty(this, "meshRegistry", void 0);

    _defineProperty(this, "meshLoadAttempted", void 0);

    _defineProperty(this, "scaleMapping", void 0);

    _defineProperty(this, "geomCount", void 0);

    _defineProperty(this, "materials", void 0);

    _defineProperty(this, "desatMaterials", void 0);

    _defineProperty(this, "highlightMaterial", void 0);

    _defineProperty(this, "followObjectIndex", void 0);

    _defineProperty(this, "runTimeMeshes", void 0);

    _defineProperty(this, "runTimeFiberMeshes", void 0);

    _defineProperty(this, "mlastNumberOfAgents", void 0);

    _defineProperty(this, "colorVariant", void 0);

    _defineProperty(this, "fixLightsToCamera", void 0);

    _defineProperty(this, "highlightedId", void 0);

    _defineProperty(this, "paths", void 0);

    _defineProperty(this, "sphereGeometry", void 0);

    _defineProperty(this, "membrane", void 0);

    _defineProperty(this, "mlogger", void 0);

    _defineProperty(this, "renderer", void 0);

    _defineProperty(this, "scene", void 0);

    _defineProperty(this, "camera", void 0);

    _defineProperty(this, "controls", void 0);

    _defineProperty(this, "dl", void 0);

    _defineProperty(this, "boundingBox", void 0);

    _defineProperty(this, "boundingBoxMesh", void 0);

    _defineProperty(this, "hemiLight", void 0);

    _defineProperty(this, "moleculeRenderer", void 0);

    _defineProperty(this, "atomSpread", 3.0);

    _defineProperty(this, "numAtomsPerAgent", 8);

    _defineProperty(this, "currentSceneAgents", void 0);

    _defineProperty(this, "colorsData", void 0);

    _defineProperty(this, "lightsGroup", void 0);

    _defineProperty(this, "agentMeshGroup", void 0);

    _defineProperty(this, "agentFiberGroup", void 0);

    _defineProperty(this, "agentPathGroup", void 0);

    _defineProperty(this, "raycaster", void 0);

    _defineProperty(this, "errorMesh", void 0);

    this.renderStyle = RenderStyle.GENERIC;
    this.visGeomMap = new Map();
    this.meshRegistry = new Map();
    this.meshLoadAttempted = new Map();
    this.scaleMapping = new Map();
    this.geomCount = MAX_MESHES;
    this.materials = [];
    this.desatMaterials = [];
    this.highlightMaterial = new MeshBasicMaterial({
      color: new Color(1, 0, 0)
    });
    this.followObjectIndex = NO_AGENT;
    this.runTimeMeshes = [];
    this.runTimeFiberMeshes = new Map();
    this.mlastNumberOfAgents = 0;
    this.colorVariant = 50;
    this.fixLightsToCamera = true;
    this.highlightedId = -1; // will store data for all agents that are drawing paths

    this.paths = []; // the canonical default geometry instance

    this.sphereGeometry = new SphereBufferGeometry(1, 32, 32);
    this.setupScene();
    this.membrane = {
      // assume only one membrane mesh
      typeId: -1,
      mesh: undefined,
      runtimeMeshIndex: -1,
      faces: [{
        name: "curved_5nm_Right"
      }, {
        name: "curved_5nm_Left"
      }],
      sides: [{
        name: "curved_5nm_Bottom"
      }, {
        name: "curved_5nm_Top"
      }, {
        name: "curved_5nm_Back"
      }, {
        name: "curved_5nm_Front"
      }],
      facesMaterial: MembraneShader.MembraneShader.clone(),
      sidesMaterial: MembraneShader.MembraneShader.clone()
    };
    this.membrane.facesMaterial.uniforms.uvscale.value = new Vector2(40.0, 40.0);
    this.membrane.sidesMaterial.uniforms.uvscale.value = new Vector2(2.0, 40.0);
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
    this.agentPathGroup = new Group();
    this.camera = new PerspectiveCamera(75, 100 / 100, 0.1, 10000);
    this.dl = new DirectionalLight(0xffffff, 0.6);
    this.hemiLight = new HemisphereLight(0xffffff, 0x000000, 0.5);
    this.renderer = new WebGLRenderer();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.boundingBox = new Box3(new Vector3(0, 0, 0), new Vector3(100, 100, 100));
    this.boundingBoxMesh = new Box3Helper(this.boundingBox, BOUNDING_BOX_COLOR);
    this.errorMesh = new Mesh(this.sphereGeometry);
    this.currentSceneAgents = [];
    this.colorsData = new Float32Array(0);

    if (loggerLevel === jsLogger.DEBUG) {
      this.setupGui();
    }

    this.raycaster = new Raycaster();
  }

  _createClass(VisGeometry, [{
    key: "setBackgroundColor",
    value: function setBackgroundColor(c) {
      // convert from a PropColor to a THREE.Color
      this.backgroundColor = Array.isArray(c) ? new Color(c[0], c[1], c[2]) : new Color(c);
      this.pathEndColor = this.backgroundColor.clone();
      this.moleculeRenderer.setBackgroundColor(this.backgroundColor);
      this.renderer.setClearColor(this.backgroundColor, 1);
    }
  }, {
    key: "setupGui",
    value: function setupGui() {
      var gui = new dat.GUI();
      var settings = {
        atomSpread: this.atomSpread,
        numAtoms: this.numAtomsPerAgent
      };
      var self = this;
      gui.add(settings, "atomSpread", 0.01, 8.0).onChange(function (value) {
        self.atomSpread = value;
        self.updateScene(self.currentSceneAgents);
      });
      gui.add(settings, "numAtoms", 1, 20).step(1).onChange(function (value) {
        self.numAtomsPerAgent = Math.floor(value);
        self.updateScene(self.currentSceneAgents);
      });
      this.moleculeRenderer.setupGui(gui);
    }
  }, {
    key: "switchRenderStyle",
    value: function switchRenderStyle() {
      this.renderStyle = this.renderStyle === RenderStyle.GENERIC ? RenderStyle.MOLECULAR : RenderStyle.GENERIC;
      this.agentMeshGroup.visible = this.renderStyle === RenderStyle.GENERIC;
      this.updateScene(this.currentSceneAgents);
    }
  }, {
    key: "handleTrajectoryData",
    value: function handleTrajectoryData(trajectoryData) {
      // get bounds.
      if (trajectoryData.hasOwnProperty("boxSizeX") && trajectoryData.hasOwnProperty("boxSizeY") && trajectoryData.hasOwnProperty("boxSizeZ")) {
        var bx = trajectoryData.boxSizeX;
        var by = trajectoryData.boxSizeY;
        var bz = trajectoryData.boxSizeZ;
        var epsilon = 0.000001;

        if (Math.abs(bx) < epsilon || Math.abs(by) < epsilon || Math.abs(bz) < epsilon) {
          console.log("WARNING: Bounding box: at least one bound is zero; using default bounds");
          this.resetBounds(DEFAULT_VOLUME_BOUNDS);
        } else {
          this.resetBounds([-bx / 2, -by / 2, -bz / 2, bx / 2, by / 2, bz / 2]);
        }
      } else {
        this.resetBounds(DEFAULT_VOLUME_BOUNDS);
      }
    }
  }, {
    key: "resetCamera",
    value: function resetCamera() {
      this.controls.reset();
    }
  }, {
    key: "getFollowObject",
    value: function getFollowObject() {
      return this.followObjectIndex;
    }
  }, {
    key: "setFollowObject",
    value: function setFollowObject(obj) {
      if (obj === this.membrane.runtimeMeshIndex) {
        return;
      }

      if (this.followObjectIndex !== NO_AGENT) {
        var runtimeMesh = this.getMesh(this.followObjectIndex); // find the baseMaterial by examining the followObject

        var material = null;

        if (runtimeMesh.userData) {
          material = runtimeMesh.userData.baseMaterial;
        } else {
          runtimeMesh.traverse(function (child) {
            if (child.userData) {
              material = child.userData.baseMaterial;
            }
          });
        }

        if (material) {
          this.assignMaterial(runtimeMesh, material);
        }
      }

      this.followObjectIndex = obj;

      if (obj !== NO_AGENT) {
        var _runtimeMesh = this.getMesh(obj);

        this.assignMaterial(_runtimeMesh, this.highlightMaterial);
      }
    } // equivalent to setFollowObject(NO_AGENT)

  }, {
    key: "unfollow",
    value: function unfollow() {
      this.followObjectIndex = NO_AGENT;
    }
  }, {
    key: "setHighlightById",
    value: function setHighlightById(id) {
      if (this.highlightedId === id) {
        return;
      }

      this.highlightedId = id; // go over all objects and update material

      var nMeshes = this.runTimeMeshes.length;

      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var runtimeMesh = this.getMesh(i);

        if (runtimeMesh.userData && runtimeMesh.userData.active) {
          runtimeMesh.userData.baseMaterial = this.getMaterial(runtimeMesh.userData.materialType, runtimeMesh.userData.typeId);
          this.assignMaterial(runtimeMesh, runtimeMesh.userData.baseMaterial);
        }
      }
    }
  }, {
    key: "dehighlight",
    value: function dehighlight() {
      this.setHighlightById(-1);
    }
  }, {
    key: "onNewRuntimeGeometryType",
    value: function onNewRuntimeGeometryType(meshName) {
      // find all typeIds for this meshName
      var typeIds = _toConsumableArray(this.visGeomMap.entries()).filter(function (_ref) {
        var v = _ref[1];
        return v === meshName;
      }).map(function (_ref2) {
        var _ref3 = _slicedToArray(_ref2, 1),
            k = _ref3[0];

        return k;
      }); // assuming the meshGeom has already been added to the registry


      var meshGeom = this.meshRegistry.get(meshName); // go over all objects and update mesh of this typeId
      // if this happens before the first updateScene, then the runtimeMeshes don't have type id's yet.

      var nMeshes = this.runTimeMeshes.length;

      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var runtimeMesh = this.getMesh(i);

        if (runtimeMesh.userData && typeIds.includes(runtimeMesh.userData.typeId)) {
          var isFollowedObject = i === this.followObjectIndex;
          runtimeMesh = this.setupMeshGeometry(i, runtimeMesh, meshGeom, isFollowedObject);
        }
      }
    }
  }, {
    key: "setUpControls",
    value: function setUpControls(element) {
      this.controls = new OrbitControls(this.camera, element);
      this.controls.maxDistance = 750;
      this.controls.minDistance = 5;
      this.controls.zoomSpeed = 2;
      this.controls.enablePan = false;
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
      this.agentMeshGroup = new Group();
      this.agentMeshGroup.name = "agent meshes";
      this.scene.add(this.agentMeshGroup);
      this.agentFiberGroup = new Group();
      this.agentFiberGroup.name = "agent fibers";
      this.scene.add(this.agentFiberGroup);
      this.agentPathGroup = new Group();
      this.agentPathGroup.name = "agent paths";
      this.scene.add(this.agentPathGroup);
      this.camera = new PerspectiveCamera(75, initWidth / initHeight, 0.1, 1000);
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
        this.renderer = new WebGLRenderer();
      } else {
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("webgl2", {
          alpha: false
        });
        var rendererParams = {
          canvas: canvas,
          context: context
        };
        this.renderer = new WebGLRenderer(rendererParams);
      }

      this.renderer.setSize(initWidth, initHeight); // expected to change when reparented

      this.renderer.setClearColor(this.backgroundColor, 1);
      this.renderer.clear();
      this.camera.position.z = 120;
    }
  }, {
    key: "loadObj",
    value: function loadObj(meshName) {
      var _this = this;

      var objLoader = new OBJLoader();
      objLoader.load("https://aics-agentviz-data.s3.us-east-2.amazonaws.com/meshes/obj/".concat(meshName), function (object) {
        _this.logger.debug("Finished loading mesh: ", meshName);

        _this.addMesh(meshName, object);

        _this.onNewRuntimeGeometryType(meshName);
      }, function (xhr) {
        _this.logger.debug(meshName, " ", "".concat(xhr.loaded / xhr.total * 100, "% loaded"));
      }, function (error) {
        _this.logger.debug("Failed to load mesh: ", error, meshName);
      });
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.moleculeRenderer.resize(width, height);
    }
  }, {
    key: "reparent",
    value: function reparent(parent) {
      var _this2 = this;

      if (parent === "undefined" || parent == null) {
        return;
      }

      var height = parent.scrollHeight;
      var width = parent.scrollWidth;
      parent.appendChild(this.renderer.domElement);
      this.setUpControls(this.renderer.domElement);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.moleculeRenderer.resize(width, height);
      this.renderer.setClearColor(this.backgroundColor, 1.0);
      this.renderer.clear();
      this.renderer.domElement.setAttribute("style", "top: 0px; left: 0px");

      this.renderer.domElement.onmouseenter = function () {
        return _this2.enableControls();
      };

      this.renderer.domElement.onmouseleave = function () {
        return _this2.disableControls();
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
      if (this.runTimeMeshes.length == 0) {
        return;
      }

      var elapsedSeconds = time / 1000;

      if (this.membrane.mesh) {
        this.membrane.facesMaterial.uniforms.iTime.value = elapsedSeconds;
        this.membrane.sidesMaterial.uniforms.iTime.value = elapsedSeconds;
        this.renderer.getDrawingBufferSize(this.membrane.facesMaterial.uniforms.iResolution.value);
        this.renderer.getDrawingBufferSize(this.membrane.sidesMaterial.uniforms.iResolution.value);
      }

      this.controls.update();
      this.animateCamera();

      if (this.dl && this.fixLightsToCamera) {
        // position directional light at camera (facing scene, as headlight!)
        this.dl.position.setFromMatrixColumn(this.camera.matrixWorld, 2); //this.dl.position.copy(this.camera.position);
      }

      if (this.hemiLight && this.fixLightsToCamera) {
        // make hemi light come down from vertical of screen (camera up)
        this.hemiLight.position.setFromMatrixColumn(this.camera.matrixWorld, 1);
      }

      if (this.renderStyle == RenderStyle.GENERIC) {
        this.renderer.render(this.scene, this.camera);
      } else {
        this.moleculeRenderer.setHighlightInstance(this.followObjectIndex);
        this.moleculeRenderer.render(this.renderer, this.camera, null);
        this.renderer.autoClear = false;
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = true;
      }
    }
  }, {
    key: "hitTest",
    value: function hitTest(event) {
      var size = new Vector2();
      this.renderer.getSize(size);

      if (this.renderStyle === RenderStyle.GENERIC) {
        var mouse = {
          x: event.offsetX / size.x * 2 - 1,
          y: -(event.offsetY / size.y) * 2 + 1
        };
        this.raycaster.setFromCamera(mouse, this.camera); // only intersect the agent mesh group.
        // TODO: intersect fibers also

        var intersects = this.raycaster.intersectObjects(this.agentMeshGroup.children, true);

        if (intersects && intersects.length) {
          var obj = intersects[0].object; // if the object has a parent and the parent is not the scene, use that.
          // assumption: obj file meshes load into their own Groups
          // and have only one level of hierarchy.

          if (!obj.userData || !obj.userData.index) {
            if (obj.parent && obj.parent !== this.agentMeshGroup) {
              obj = obj.parent;
            }
          }

          return obj.userData.index;
        } else {
          return NO_AGENT;
        }
      } else {
        // read from instance buffer pixel!
        return this.moleculeRenderer.hitTest(this.renderer, event.offsetX, size.y - event.offsetY);
      }
    }
    /**
     *   Run Time Mesh functions
     */

  }, {
    key: "createMaterials",
    value: function createMaterials(colors) {
      var numColors = colors.length; // fill buffer of colors:

      this.colorsData = new Float32Array(numColors * 4);

      for (var i = 0; i < numColors; i += 1) {
        // each color is currently a hex value:
        this.colorsData[i * 4 + 0] = ((colors[i] & 0x00ff0000) >> 16) / 255.0;
        this.colorsData[i * 4 + 1] = ((colors[i] & 0x0000ff00) >> 8) / 255.0;
        this.colorsData[i * 4 + 2] = ((colors[i] & 0x000000ff) >> 0) / 255.0;
        this.colorsData[i * 4 + 3] = 1.0;
        this.materials.push(new MeshLambertMaterial({
          color: colors[i]
        }));
        var hsl = {
          h: 0,
          s: 0,
          l: 0
        };
        var desatColor = new Color(colors[i]);
        hsl = desatColor.getHSL(hsl);
        desatColor.setHSL(hsl.h, 0.5 * hsl.s, hsl.l);
        this.desatMaterials.push(new MeshLambertMaterial({
          color: desatColor,
          opacity: 0.25,
          transparent: true
        }));
      }

      this.moleculeRenderer.updateColors(numColors, this.colorsData);
    }
  }, {
    key: "createMeshes",
    value: function createMeshes() {
      this.geomCount = MAX_MESHES;
      var sphereGeom = this.getSphereGeom();
      var materials = this.materials; // empty buffer of molecule positions, to be filled. (init all to origin)

      this.moleculeRenderer.createMoleculeBuffer(this.geomCount * this.numAtomsPerAgent); //multipass render:
      // draw moleculebuffer into several render targets to store depth, normals, colors
      // draw quad to composite the buffers into final frame
      // create placeholder meshes and fibers

      for (var i = 0; i < this.geomCount; i += 1) {
        var runtimeMesh = new Mesh(sphereGeom, materials[0]);
        runtimeMesh.name = "Mesh_".concat(i.toString());
        runtimeMesh.visible = false;
        this.runTimeMeshes[i] = runtimeMesh;
        this.agentMeshGroup.add(runtimeMesh);
        var fibercurve = new LineCurve3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
        var geometry = new TubeBufferGeometry(fibercurve, 1, 1, 1, false);
        var runtimeFiberMesh = new Mesh(geometry, materials[0]);
        runtimeFiberMesh.name = "Fiber_".concat(i.toString());
        runtimeFiberMesh.visible = false;
        this.runTimeFiberMeshes.set(runtimeFiberMesh.name, runtimeFiberMesh);
        this.agentFiberGroup.add(runtimeFiberMesh);
        var runtimeFiberEndcapMesh0 = new Mesh(sphereGeom, materials[0]);
        runtimeFiberEndcapMesh0.name = "FiberEnd0_".concat(i.toString());
        runtimeFiberEndcapMesh0.visible = false;
        this.runTimeFiberMeshes.set(runtimeFiberEndcapMesh0.name, runtimeFiberEndcapMesh0);
        this.agentFiberGroup.add(runtimeFiberEndcapMesh0);
        var runtimeFiberEndcapMesh1 = new Mesh(sphereGeom, materials[0]);
        runtimeFiberEndcapMesh1.name = "FiberEnd1_".concat(i.toString());
        runtimeFiberEndcapMesh1.visible = false;
        this.runTimeFiberMeshes.set(runtimeFiberEndcapMesh1.name, runtimeFiberEndcapMesh1);
        this.agentFiberGroup.add(runtimeFiberEndcapMesh1);
      }
    }
  }, {
    key: "addMesh",
    value: function addMesh(meshName, mesh) {
      this.meshRegistry.set(meshName, mesh);

      if (!mesh.name) {
        mesh.name = meshName;
      }

      if (meshName.includes("membrane")) {
        this.membrane.mesh = mesh;
        this.assignMembraneMaterial(mesh);
      }
    }
  }, {
    key: "getMesh",
    value: function getMesh(index) {
      return this.runTimeMeshes[index];
    }
  }, {
    key: "resetMesh",
    value: function resetMesh(index, obj) {
      this.runTimeMeshes[index] = obj;
    }
  }, {
    key: "getFiberMesh",
    value: function getFiberMesh(name) {
      var mesh = this.runTimeFiberMeshes.get(name);

      if (mesh) {
        mesh;
      }

      return this.errorMesh;
    }
  }, {
    key: "getMaterial",
    value: function getMaterial(index, typeId) {
      // if no highlight, or if this is the highlighed type, then use regular material, otherwise use desaturated.
      // todo strings or numbers for these ids?????
      var isHighlighted = this.highlightedId == -1 || this.highlightedId == typeId; // membrane is special

      if (typeId === this.membrane.typeId) {
        return isHighlighted ? this.membrane.facesMaterial : this.desatMaterials[0];
      }

      var matArray = isHighlighted ? this.materials : this.desatMaterials;
      return matArray[Number(index) % matArray.length];
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
      this.meshLoadAttempted.clear();
      this.scaleMapping.clear();
    }
    /**
     *   Map Type ID -> Geometry
     */

  }, {
    key: "mapIdToGeom",
    value: function mapIdToGeom(id, meshName) {
      this.logger.debug("Mesh for id ", id, " set to ", meshName);
      this.visGeomMap.set(id, meshName);

      if (meshName.includes("membrane")) {
        this.membrane.typeId = id;
      }

      if (meshName && !this.meshRegistry.has(meshName) && !this.meshLoadAttempted.get(meshName)) {
        this.loadObj(meshName);
        this.meshLoadAttempted.set(meshName, true);
      }
    }
  }, {
    key: "getGeomFromId",
    value: function getGeomFromId(id) {
      if (this.visGeomMap.has(id)) {
        var meshName = this.visGeomMap.get(id);

        if (meshName && this.meshRegistry.has(meshName)) {
          var mesh = this.meshRegistry.get(meshName);

          if (mesh) {
            return mesh;
          }
        }
      }

      return null;
    }
  }, {
    key: "mapFromJSON",
    value: function mapFromJSON(name, filePath, callback) {
      var jsonRequest = new Request(filePath);
      var self = this;
      return fetch(jsonRequest).then(function (response) {
        return response.json();
      }).then(function (data) {
        self.resetMapping();
        var jsonData = data;
        self.logger.debug("JSON Mesh mapping loaded: ", jsonData);
        Object.keys(jsonData).forEach(function (id) {
          var entry = jsonData[id];

          if (id === "size") {
            console.log("WARNING: Ignoring deprecated bounding box data");
          } else {
            self.mapIdToGeom(Number(id), entry.mesh);
            self.setScaleForId(Number(id), entry.scale);
          }
        });

        if (callback) {
          callback(jsonData);
        }
      });
    }
  }, {
    key: "resetBounds",
    value: function resetBounds(boundsAsArray) {
      if (!boundsAsArray) {
        console.log("invalid bounds received");
        return;
      }

      var visible = this.boundingBoxMesh ? this.boundingBoxMesh.visible : true;
      this.scene.remove(this.boundingBoxMesh); // array is minx,miny,minz, maxx,maxy,maxz

      this.boundingBox = new Box3(new Vector3(boundsAsArray[0], boundsAsArray[1], boundsAsArray[2]), new Vector3(boundsAsArray[3], boundsAsArray[4], boundsAsArray[5]));
      this.boundingBoxMesh = new Box3Helper(this.boundingBox, BOUNDING_BOX_COLOR);
      this.boundingBoxMesh.visible = visible;
      this.scene.add(this.boundingBoxMesh);
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
    /**
     *   Default Geometry
     */

  }, {
    key: "getSphereGeom",
    value: function getSphereGeom() {
      var sphereId = -1;

      if (!this.meshRegistry.has(sphereId)) {
        this.meshRegistry.set(sphereId, new Mesh(this.sphereGeometry));
      }

      if (this.meshRegistry.has(sphereId)) {
        var sphereMesh = this.meshRegistry.get(sphereId);

        if (sphereMesh) {
          var geom = sphereMesh.geometry;

          if (geom) {
            return geom;
          }
        }
      }

      return this.sphereGeometry;
    }
    /**
     *   Update Scene
     * */

  }, {
    key: "updateScene",
    value: function updateScene(agents) {
      var _this3 = this;

      this.currentSceneAgents = agents;
      var sphereGeometry = this.getSphereGeom();
      var fiberIndex = 0; // these have been set to correspond to backend values

      var visTypes = Object.freeze({
        ID_VIS_TYPE_DEFAULT: 1000,
        ID_VIS_TYPE_FIBER: 1001
      });
      var dx, dy, dz; // The agents sent over are mapped by an integer id

      var buf = new Float32Array(4 * agents.length * this.numAtomsPerAgent);
      var typeids = new Float32Array(agents.length * this.numAtomsPerAgent);
      var instanceids = new Float32Array(agents.length * this.numAtomsPerAgent);
      agents.forEach(function (agentData, i) {
        var visType = agentData["vis-type"];
        var typeId = agentData.type;

        var scale = _this3.getScaleForId(typeId);

        if (visType === visTypes.ID_VIS_TYPE_DEFAULT) {
          var materialType = (typeId + 1) * _this3.colorVariant;

          var runtimeMesh = _this3.getMesh(i);

          var isFollowedObject = i === _this3.followObjectIndex;
          var lastTypeId = runtimeMesh.userData ? runtimeMesh.userData.typeId : -1;

          if (!runtimeMesh.userData) {
            runtimeMesh.userData = {
              active: true,
              baseMaterial: _this3.getMaterial(materialType, typeId),
              index: i,
              typeId: typeId,
              materialType: materialType
            };
          } else {
            runtimeMesh.userData.active = true;
            runtimeMesh.userData.baseMaterial = _this3.getMaterial(materialType, typeId);
            runtimeMesh.userData.index = i;
            runtimeMesh.userData.typeId = typeId;
            runtimeMesh.userData.materialType = materialType;
          }

          if (runtimeMesh.geometry === sphereGeometry || typeId !== lastTypeId) {
            var meshGeom = _this3.getGeomFromId(typeId);

            if (meshGeom && meshGeom.children) {
              runtimeMesh = _this3.setupMeshGeometry(i, runtimeMesh, meshGeom, isFollowedObject);
            } else {
              _this3.assignMaterial(runtimeMesh, runtimeMesh.userData.baseMaterial);
            }
          }

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
          runtimeMesh.scale.x = agentData.cr * scale;
          runtimeMesh.scale.y = agentData.cr * scale;
          runtimeMesh.scale.z = agentData.cr * scale;

          for (var k = 0; k < _this3.numAtomsPerAgent; ++k) {
            buf[(i * _this3.numAtomsPerAgent + k) * 4 + 0] = agentData.x + (Math.random() - 0.5) * _this3.atomSpread;
            buf[(i * _this3.numAtomsPerAgent + k) * 4 + 1] = agentData.y + (Math.random() - 0.5) * _this3.atomSpread;
            buf[(i * _this3.numAtomsPerAgent + k) * 4 + 2] = agentData.z + (Math.random() - 0.5) * _this3.atomSpread;
            buf[(i * _this3.numAtomsPerAgent + k) * 4 + 3] = 1.0; //                    typeids[i * this.numAtomsPerAgent + k] = typeId;

            typeids[i * _this3.numAtomsPerAgent + k] = materialType;
            instanceids[i * _this3.numAtomsPerAgent + k] = i;
          }

          var path = _this3.findPathForAgentIndex(i);

          if (path) {
            _this3.addPointToPath(path, agentData.x, agentData.y, agentData.z, dx, dy, dz);
          }
        } else if (visType === visTypes.ID_VIS_TYPE_FIBER) {
          var name = "Fiber_".concat(fiberIndex.toString());

          var runtimeFiberMesh = _this3.getFiberMesh(name);

          var curvePoints = [];
          var subpoints = agentData.subpoints;
          var numSubPoints = subpoints.length;

          if (numSubPoints % 3 !== 0) {
            _this3.logger.warn("Warning, subpoints array does not contain a multiple of 3");

            _this3.logger.warn(agentData);

            return;
          }

          var collisionRadius = agentData.cr;

          for (var j = 0; j < numSubPoints; j += 3) {
            var x = subpoints[j];
            var y = subpoints[j + 1];
            var z = subpoints[j + 2];
            curvePoints.push(new Vector3(x, y, z));
          }

          var fibercurve = new CatmullRomCurve3(curvePoints);
          var fibergeometry = new TubeBufferGeometry(fibercurve, 4 * numSubPoints / 3, collisionRadius * scale * 0.5, 8, false);
          runtimeFiberMesh.geometry = fibergeometry;
          runtimeFiberMesh.visible = true;
          var nameEnd0 = "FiberEnd0_".concat(fiberIndex.toString());

          var runtimeFiberEncapMesh0 = _this3.getFiberMesh(nameEnd0);

          runtimeFiberEncapMesh0.position.x = curvePoints[0].x;
          runtimeFiberEncapMesh0.position.y = curvePoints[0].y;
          runtimeFiberEncapMesh0.position.z = curvePoints[0].z;
          runtimeFiberEncapMesh0.scale.x = collisionRadius * scale * 0.5;
          runtimeFiberEncapMesh0.scale.y = collisionRadius * scale * 0.5;
          runtimeFiberEncapMesh0.scale.z = collisionRadius * scale * 0.5;
          runtimeFiberEncapMesh0.visible = true;
          var nameEnd1 = "FiberEnd1_".concat(fiberIndex.toString());

          var runtimeFiberEncapMesh1 = _this3.getFiberMesh(nameEnd1);

          runtimeFiberEncapMesh1.position.x = curvePoints[curvePoints.length - 1].x;
          runtimeFiberEncapMesh1.position.y = curvePoints[curvePoints.length - 1].y;
          runtimeFiberEncapMesh1.position.z = curvePoints[curvePoints.length - 1].z;
          runtimeFiberEncapMesh1.scale.x = collisionRadius * scale * 0.5;
          runtimeFiberEncapMesh1.scale.y = collisionRadius * scale * 0.5;
          runtimeFiberEncapMesh1.scale.z = collisionRadius * scale * 0.5;
          runtimeFiberEncapMesh1.visible = true;
          fiberIndex += 1;
        }
      });
      this.moleculeRenderer.updateMolecules(buf, typeids, instanceids, agents.length, this.numAtomsPerAgent);
      this.hideUnusedFibers(fiberIndex);
    }
  }, {
    key: "animateCamera",
    value: function animateCamera() {
      var lerpTarget = true;
      var lerpPosition = true;
      var lerpRate = 0.2;

      if (this.followObjectIndex !== NO_AGENT) {
        // keep camera at same distance from target.
        var direction = new Vector3().subVectors(this.camera.position, this.controls.target);
        var distance = direction.length();
        direction.normalize();
        var newTarget = new Vector3();
        var followedObject = this.getMesh(this.followObjectIndex);
        newTarget.copy(followedObject.position); // update controls target for orbiting

        if (lerpTarget) {
          this.controls.target.lerp(newTarget, lerpRate);
        } else {
          this.controls.target.copy(newTarget);
        } // update new camera position


        var newPosition = new Vector3();
        newPosition.subVectors(followedObject.position, direction.multiplyScalar(-distance));

        if (lerpPosition) {
          this.camera.position.lerp(newPosition, lerpRate);
        } else {
          this.camera.position.copy(newPosition);
        }
      }
    }
  }, {
    key: "setupMeshGeometry",
    value: function setupMeshGeometry(i, runtimeMesh, meshGeom, isFollowedObject) {
      // remember current transform
      var p = runtimeMesh.position;
      var r = runtimeMesh.rotation;
      var s = runtimeMesh.scale;

      if (this.membrane.mesh === meshGeom) {
        if (this.membrane.mesh && runtimeMesh.children.length !== this.membrane.mesh.children.length) {
          // to avoid a deep clone of userData, just reuse the instance
          var userData = runtimeMesh.userData;
          var visible = runtimeMesh.visible;
          runtimeMesh.userData = null;
          this.agentMeshGroup.remove(runtimeMesh);
          runtimeMesh = this.membrane.mesh.clone();
          runtimeMesh.userData = userData;
          runtimeMesh.visible = visible;
          this.assignMembraneMaterial(runtimeMesh);
          this.agentMeshGroup.add(runtimeMesh);
          this.resetMesh(i, runtimeMesh);
          this.membrane.runtimeMeshIndex = i;
        }
      } else {
        // to avoid a deep clone of userData, just reuse the instance
        var _userData = runtimeMesh.userData;
        var _visible = runtimeMesh.visible;
        runtimeMesh.userData = null;
        this.agentMeshGroup.remove(runtimeMesh);
        runtimeMesh = meshGeom.clone();
        runtimeMesh.userData = _userData;
        runtimeMesh.visible = _visible;
        this.agentMeshGroup.add(runtimeMesh);
        this.resetMesh(i, runtimeMesh);

        if (isFollowedObject) {
          this.assignMaterial(runtimeMesh, this.highlightMaterial);
        } else {
          this.assignMaterial(runtimeMesh, runtimeMesh.userData.baseMaterial);
        }
      } // restore transform


      runtimeMesh.position.copy(p);
      runtimeMesh.rotation.copy(r);
      runtimeMesh.scale.copy(s);
      return runtimeMesh;
    }
  }, {
    key: "assignMaterial",
    value: function assignMaterial(runtimeMesh, material) {
      if (runtimeMesh.name.includes("membrane")) {
        return this.assignMembraneMaterial(runtimeMesh);
      }

      if (runtimeMesh instanceof Mesh) {
        runtimeMesh.material = material;
      } else {
        runtimeMesh.traverse(function (child) {
          if (child instanceof Mesh) {
            child.material = material;
          }
        });
      }
    }
  }, {
    key: "assignMembraneMaterial",
    value: function assignMembraneMaterial(runtimeMesh) {
      var _this4 = this;

      var isHighlighted = this.highlightedId == -1 || this.highlightedId == runtimeMesh.userData.typeId;

      if (isHighlighted) {
        // at this time, assign separate material parameters to the faces and sides of the membrane
        var faceNames = this.membrane.faces.map(function (el) {
          return el.name;
        });
        var sideNames = this.membrane.sides.map(function (el) {
          return el.name;
        });
        runtimeMesh.traverse(function (child) {
          if (child instanceof Mesh) {
            if (faceNames.includes(child.name)) {
              child.material = _this4.membrane.facesMaterial;
            } else if (sideNames.includes(child.name)) {
              child.material = _this4.membrane.sidesMaterial;
            }
          }
        });
      } else {
        runtimeMesh.traverse(function (child) {
          if (child instanceof Mesh) {
            child.material = _this4.desatMaterials[0];
          }
        });
      }
    }
  }, {
    key: "getMaterialOfAgentIndex",
    value: function getMaterialOfAgentIndex(idx) {
      var runtimeMesh = this.getMesh(idx);

      if (runtimeMesh.userData) {
        return runtimeMesh.userData.baseMaterial;
      }

      return undefined;
    }
  }, {
    key: "findPathForAgentIndex",
    value: function findPathForAgentIndex(idx) {
      var path = this.paths.find(function (path) {
        return path.agent === idx;
      });

      if (path) {
        return path;
      }

      return null;
    }
  }, {
    key: "removePathForObject",
    value: function removePathForObject(obj) {
      if (obj && obj.userData && obj.userData.index !== undefined) {
        this.removePathForAgentIndex(obj.userData.index);
      }
    }
  }, {
    key: "addPathForObject",
    value: function addPathForObject(obj) {
      if (obj && obj.userData && obj.userData.index !== undefined) {
        this.addPathForAgentIndex(obj.userData.index);
      }
    } // assumes color is a threejs color, or null/undefined

  }, {
    key: "addPathForAgentIndex",
    value: function addPathForAgentIndex(idx, maxSegments, color) {
      // make sure the idx is not already in our list.
      // could be optimized...
      var foundpath = this.findPathForAgentIndex(idx);

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
        var mat = this.getMaterialOfAgentIndex(idx);
        color = mat && mat.color ? mat.color.clone() : new Color(0xffffff);
      }

      var pathdata = {
        agent: idx,
        numSegments: 0,
        maxSegments: maxSegments,
        color: color,
        points: new Float32Array(maxSegments * 3 * 2),
        colors: new Float32Array(maxSegments * 3 * 2),
        geometry: new BufferGeometry(),
        material: new LineBasicMaterial({
          // the line will be colored per-vertex
          vertexColors: VertexColors
        }),
        // will create line "lazily" when the line has more than 1 point(?)
        line: null
      };
      pathdata.geometry.setAttribute("position", new BufferAttribute(pathdata.points, 3));
      pathdata.geometry.setAttribute("color", new BufferAttribute(pathdata.colors, 3)); // path starts empty: draw range spans nothing

      pathdata.geometry.setDrawRange(0, 0);
      pathdata.line = new LineSegments(pathdata.geometry, pathdata.material);
      pathdata.line.frustumCulled = false;
      this.agentPathGroup.add(pathdata.line);
      this.paths.push(pathdata);
      return pathdata;
    }
  }, {
    key: "removePathForAgentIndex",
    value: function removePathForAgentIndex(idx) {
      var pathindex = this.paths.findIndex(function (path) {
        return path.agent === idx;
      });

      if (pathindex === -1) {
        console.log("attempted to remove path for agent " + idx + " that doesn't exist.");
        return;
      }

      var path = this.paths[pathindex];
      this.agentPathGroup.remove(path.line);
      this.paths.splice(pathindex, 1);
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
    key: "setShowMeshes",
    value: function setShowMeshes(showMeshes) {
      var nMeshes = this.runTimeMeshes.length;

      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        var runtimeMesh = this.getMesh(i);

        if (runtimeMesh.userData && runtimeMesh.userData.active) {
          runtimeMesh.visible = showMeshes;
        }
      }
    }
  }, {
    key: "setShowBounds",
    value: function setShowBounds(showBounds) {
      this.boundingBoxMesh.visible = showBounds;
    }
  }, {
    key: "showPathForAgentIndex",
    value: function showPathForAgentIndex(idx, visible) {
      var path = this.findPathForAgentIndex(idx);

      if (path) {
        if (path.line) {
          path.line.visible = visible;
        }
      }
    }
  }, {
    key: "hideUnusedMeshes",
    value: function hideUnusedMeshes(numberOfAgents) {
      var nMeshes = this.runTimeMeshes.length;

      for (var i = numberOfAgents; i < MAX_MESHES && i < nMeshes; i += 1) {
        var runtimeMesh = this.getMesh(i);

        if (runtimeMesh.visible === false) {
          break;
        }

        runtimeMesh.visible = false;

        if (runtimeMesh.userData) {
          runtimeMesh.userData.active = false;
        } // hide the path if we're hiding the agent. should we remove the path here?


        this.showPathForAgentIndex(i, false);
      }
    }
  }, {
    key: "hideUnusedFibers",
    value: function hideUnusedFibers(numberOfFibers) {
      for (var i = numberOfFibers; i < MAX_MESHES; i += 1) {
        var name = "Fiber_".concat(i.toString());
        var fiberMesh = this.getFiberMesh(name);

        if (fiberMesh.visible === false) {
          break;
        }

        var nameEnd0 = "FiberEnd0_".concat(i.toString());
        var end0 = this.getFiberMesh(nameEnd0);
        var nameEnd1 = "FiberEnd1_".concat(i.toString());
        var end1 = this.getFiberMesh(nameEnd1);
        fiberMesh.visible = false;
        end0.visible = false;
        end1.visible = false;
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      this.hideUnusedMeshes(0);
      this.hideUnusedFibers(0);
    }
  }, {
    key: "resetAllGeometry",
    value: function resetAllGeometry() {
      // set all runtime meshes back to spheres.
      var sphereGeom = this.getSphereGeom();
      var nMeshes = this.runTimeMeshes.length;

      for (var i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
        if (this.runTimeMeshes[i].userData) {
          var runtimeMesh = this.setupMeshGeometry(i, this.runTimeMeshes[i], new Mesh(sphereGeom), false);
          this.assignMaterial(runtimeMesh, new MeshLambertMaterial({
            color: 0xff00ff
          }));
        }
      }
    }
  }, {
    key: "update",
    value: function update(agents) {
      this.updateScene(agents);
      var numberOfAgents = agents.length;

      if (this.lastNumberOfAgents > numberOfAgents) {
        this.hideUnusedMeshes(numberOfAgents);
      }

      this.lastNumberOfAgents = numberOfAgents;
    }
  }, {
    key: "logger",
    get: function get() {
      return this.mlogger;
    }
  }, {
    key: "lastNumberOfAgents",
    get: function get() {
      return this.mlastNumberOfAgents;
    },
    set: function set(val) {
      this.mlastNumberOfAgents = val;
    }
  }, {
    key: "renderDom",
    get: function get() {
      return this.renderer.domElement;
    }
  }]);

  return VisGeometry;
}();

export { VisGeometry, NO_AGENT };
export default VisGeometry;