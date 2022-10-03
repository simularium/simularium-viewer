import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { forEach } from "lodash";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import jsLogger from "js-logger";
import { Mesh } from "three";
import { checkAndSanitizePath, getFileExtension } from "../../util";
import PDBModel from "./PDBModel";
import { InstancedMesh, InstanceType } from "./rendering/InstancedMesh";
import VisAgent from "./VisAgent";
import TaskQueue from "../TaskQueue";
import { GeometryDisplayType } from "./types";
export var DEFAULT_MESH_NAME = "SPHERE";

var GeometryStore = /*#__PURE__*/function () {
  /**
   * Stores Key --> GeometryData Map
   * Key can be a file name or a url (any unique string).
   *
   * Handles fetching the geometry data from an external source via
   * urls or a local file that was loaded directly into the viewer and returns the
   * resulting data as a promise.
   *
   * Won't fetch the same geometry twice for the same trajectory.
   *
   * Should be cleared out with each new trajectory loaded.
   *
   * There is a helper function for modifying meshes, but otherwise this is
   * just a store module, it doesn't know anything about the trajectory or
   * agent ids, or do anything with the geometries other than load and store them.
   */
  function GeometryStore(loggerLevel) {
    _classCallCheck(this, GeometryStore);

    _defineProperty(this, "_geoLoadAttempted", void 0);

    _defineProperty(this, "_cachedAssets", void 0);

    _defineProperty(this, "_registry", void 0);

    _defineProperty(this, "mlogger", void 0);

    this._geoLoadAttempted = new Map();
    this._cachedAssets = new Map();
    this._registry = new Map();
    this.mlogger = jsLogger.get("geometry-store");

    this._registry.set(DEFAULT_MESH_NAME, {
      displayType: GeometryDisplayType.SPHERE,
      geometry: {
        mesh: new Mesh(VisAgent.sphereGeometry),
        cancelled: false,
        instances: new InstancedMesh(InstanceType.MESH, VisAgent.sphereGeometry, DEFAULT_MESH_NAME, 1)
      }
    });

    if (loggerLevel) {
      this.mlogger.setLevel(loggerLevel);
    }
  }

  _createClass(GeometryStore, [{
    key: "reset",
    value: function reset() {
      this._geoLoadAttempted.clear();

      this._registry.clear();

      this._registry.set(DEFAULT_MESH_NAME, {
        displayType: GeometryDisplayType.SPHERE,
        geometry: {
          mesh: new Mesh(VisAgent.sphereGeometry),
          cancelled: false,
          instances: new InstancedMesh(InstanceType.MESH, VisAgent.sphereGeometry, DEFAULT_MESH_NAME, 1)
        }
      });
    }
  }, {
    key: "registry",
    get: function get() {
      return this._registry;
    }
  }, {
    key: "forEachMesh",
    value: function forEachMesh(iteratee) {
      // forEach method for manipulating ThreeJs Mesh objects
      this._registry.forEach(function (value) {
        var displayType = value.displayType;

        if (displayType !== GeometryDisplayType.PDB) {
          var agentGeo = value;
          iteratee(agentGeo);
        }
      });
    }
  }, {
    key: "forEachPDB",
    value: function forEachPDB(iteratee) {
      // forEach method for manipulating ThreeJs Mesh objects
      this._registry.forEach(function (value) {
        var displayType = value.displayType;

        if (displayType === GeometryDisplayType.PDB) {
          var agentGeo = value.geometry;
          iteratee(agentGeo);
        }
      });
    }
  }, {
    key: "getGeoForAgentType",
    value: function getGeoForAgentType(entryName) {
      var geo = this._registry.get(entryName);

      return geo || null;
    }
  }, {
    key: "cancelAll",
    value: function cancelAll() {
      // note that this leaves cancelled things in the registries.
      // This should be called before the registries are cleared and probably
      // only makes sense to do if they are indeed about to be cleared.
      // don't process any queued requests
      TaskQueue.stopAll(); // signal to cancel any pending geometries

      this._registry.forEach(function (value) {
        value.geometry.cancelled = true;
      });
    }
  }, {
    key: "cacheLocalAssets",
    value: function cacheLocalAssets(assets) {
      var _this = this;

      // store local files as data strings until they're ready to be
      // parsed as geometry.
      forEach(assets, function (value, key) {
        var path = checkAndSanitizePath(key);

        _this._cachedAssets.set(path, value);
      });
    }
  }, {
    key: "createNewSphereGeometry",
    value: function createNewSphereGeometry(meshName) {
      /** create new default geometry */
      return {
        mesh: new Mesh(VisAgent.sphereGeometry),
        cancelled: false,
        instances: new InstancedMesh(InstanceType.MESH, VisAgent.sphereGeometry, meshName, 1)
      };
    }
  }, {
    key: "setGeometryInRegistry",
    value: function setGeometryInRegistry(key, geometry, displayType) {
      this._registry.set(key, {
        geometry: geometry,
        displayType: displayType
      });
    }
  }, {
    key: "fetchPdb",
    value: function fetchPdb(url) {
      var _this2 = this;

      /** Downloads a PDB from an external source */
      var pdbModel = new PDBModel(url);
      this.setGeometryInRegistry(url, pdbModel, GeometryDisplayType.PDB);
      var actualUrl = url.slice();
      var pdbID = "";

      if (!actualUrl.startsWith("http")) {
        // assume this is a PDB ID to be loaded from the actual PDB
        // if not a valid ID, then download will fail.
        pdbID = actualUrl; // prefer mmCIF first. If this fails, we will try .pdb.
        // TODO:
        // Can we confirm that the rcsb.org servers have every id as a cif file?
        // If so, then we don't need to do this second try and we can always use .cif.

        actualUrl = "https://files.rcsb.org/download/".concat(pdbID, ".cif");
      }

      return fetch(actualUrl).then(function (response) {
        if (response.ok) {
          return response.text();
        } else if (pdbID) {
          // try again as pdb
          actualUrl = "https://files.rcsb.org/download/".concat(pdbID, ".pdb");
          return fetch(actualUrl).then(function (response) {
            if (!response.ok) {
              throw new Error("Failed to fetch ".concat(pdbModel.filePath, " from ").concat(actualUrl));
            }

            return response.text();
          });
        } else {
          throw new Error("Failed to fetch ".concat(pdbModel.filePath, " from ").concat(url));
        }
      }).then(function (data) {
        if (pdbModel.cancelled) {
          _this2._registry["delete"](url);

          return Promise.resolve(undefined);
        }

        pdbModel.parse(data, getFileExtension(actualUrl));

        var pdbEntry = _this2._registry.get(url);

        if (pdbEntry && pdbEntry.geometry === pdbModel) {
          _this2.mlogger.info("Finished downloading pdb: ", url);

          return pdbModel;
        } else {
          // This seems like some kind of terrible error if we get here.
          // Alternatively, we could try re-adding the registry entry.
          // Or reject.
          _this2.mlogger.warn("After download, GeometryStore PDB entry not found for ".concat(url));

          return Promise.resolve(undefined);
        }
      });
    }
  }, {
    key: "prepMeshRegistryForNewObj",
    value: function prepMeshRegistryForNewObj(meshName) {
      /** Create a place in the registry to store the new object registered to meshName */
      if (this._registry.has(meshName)) {
        var entry = this._registry.get(meshName);

        if (!entry) {
          return; // should be unreachable, but needed for TypeScript
        }

        var geometry = entry.geometry,
            displayType = entry.displayType;

        if (geometry && displayType !== GeometryDisplayType.PDB) {
          var meshRequest = geometry; // there is already a mesh registered but we are going to load a new one.
          // start by resetting this entry to a sphere. we will replace when the new mesh arrives

          meshRequest.mesh = new Mesh(VisAgent.sphereGeometry);
          meshRequest.instances.replaceGeometry(VisAgent.sphereGeometry, meshName);
        }
      } else {
        // if this mesh is not yet registered, then start off as a sphere
        // we will replace the sphere in here with the real geometry when it arrives.
        this.setGeometryInRegistry(meshName, this.createNewSphereGeometry(meshName), GeometryDisplayType.SPHERE);
      }
    }
  }, {
    key: "handleObjResponse",
    value: function handleObjResponse(meshName, object) {
      var item = this._registry.get(meshName);

      if (!item) {
        return; // should be unreachable, but needed for TypeScript
      }

      var meshLoadRequest = item.geometry;

      if (meshLoadRequest && meshLoadRequest.cancelled || !meshLoadRequest) {
        this._registry["delete"](meshName);

        return;
      }

      this.mlogger.debug("Finished loading mesh: ", meshName); // insert new mesh into meshRegistry
      // get its geometry first:

      var geom = null;
      object.traverse(function (obj) {
        if (!geom && obj instanceof Mesh) {
          geom = obj.geometry;
          return false;
        }
      });

      if (geom) {
        // now replace the geometry in the existing mesh registry entry
        meshLoadRequest.mesh = object;
        meshLoadRequest.instances.replaceGeometry(geom, meshName);
      } else {
        console.error("Mesh loaded but could not find instanceable geometry in it");
      }

      if (!object.name) {
        object.name = meshName;
      }
    }
  }, {
    key: "fetchObj",
    value: function fetchObj(url) {
      var _this3 = this;

      /** Request an obj from an external source */
      var objLoader = new OBJLoader();
      this.prepMeshRegistryForNewObj(url);
      return new Promise(function (resolve, reject) {
        objLoader.load(url, function (object) {
          _this3.handleObjResponse(url, object);

          resolve(object);
        }, function (xhr) {
          _this3.mlogger.info(url, " ", "".concat(xhr.loaded / xhr.total * 100, "% loaded"));
        }, function (error) {
          // if the request fails, leave agent as a sphere by default
          _this3.mlogger.warn("Failed to load mesh: ", error, url);

          return reject("Failed to load mesh: ".concat(url));
        });
      });
    }
  }, {
    key: "attemptToLoadGeometry",
    value: function attemptToLoadGeometry(urlOrPath, displayType) {
      /**
       * Load new geometry if necessary, ie this geometry hasn't already
       * been loaded or attempted and failed to be loaded.
       *
       * If it's already been attempted, or is already in the registry,
       * this will return Promise<undefined>
       *
       * Otherwise, it first checks the cache, and then tries to load via
       * a url. If provided a url and the loading fails, the geometry is replaced
       * by default geometry (sphere), and the user is notified.
       */
      if (this._cachedAssets.has(urlOrPath)) {
        // if it's in the cached assets, parse the data
        // store it in the registry, and return it
        var file = this._cachedAssets.get(urlOrPath);

        var geometry;

        if (file && displayType === GeometryDisplayType.PDB) {
          var pdbModel = new PDBModel(urlOrPath);
          pdbModel.parse(file, getFileExtension(urlOrPath));
          this.setGeometryInRegistry(urlOrPath, pdbModel, displayType);
          geometry = pdbModel;
        } else if (file && displayType === GeometryDisplayType.OBJ) {
          // stores the name in the registry
          this.prepMeshRegistryForNewObj(urlOrPath);
          var objLoader = new OBJLoader();
          var object = objLoader.parse(file);
          this.handleObjResponse(urlOrPath, object);
          geometry = object;
        } // make sure we know not to try to load it from the url


        this._geoLoadAttempted.set(urlOrPath, true); // don't need to store file data once it's loaded into registry


        this._cachedAssets["delete"](urlOrPath);

        if (!geometry) {
          // will replace geom in registry is sphere
          return Promise.reject("Tried to load from cache ".concat(urlOrPath, ", but something went wrong, check that the file formats provided match the displayType"));
        }

        return Promise.resolve(geometry);
      } else if (!this._registry.has(urlOrPath) && !this._geoLoadAttempted.get(urlOrPath)) {
        this._geoLoadAttempted.set(urlOrPath, true);

        switch (displayType) {
          case GeometryDisplayType.PDB:
            return this.fetchPdb(urlOrPath).then(function (pdbModel) {
              return pdbModel;
            });

          case GeometryDisplayType.OBJ:
            return this.fetchObj(urlOrPath).then(function (object) {
              return object;
            });

          default:
            // will replace geom in registry is sphere
            return Promise.reject("Don't know how to load this geometry: \n                        ".concat(displayType, ",\n                        ").concat(urlOrPath));
        }
      } // already loaded or attempted to load this geometry
      // still want to return a promise


      return Promise.resolve(undefined);
    }
  }, {
    key: "mapKeyToGeom",
    value: function () {
      var _mapKeyToGeom = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(id, agentVisData) {
        var _this4 = this;

        var displayType, url, isMesh, isPDB, _lookupKey, geometry, lookupKey;

        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                /**
                 * stores meshName --> actual mesh, returns a Promise.
                 * If Promise caches, the geometry is replaced with a sphere
                 * and the user is notified.
                 */
                displayType = agentVisData.displayType, url = agentVisData.url;
                this.mlogger.debug("Geo for id ".concat(id, " set to '").concat(url, "'"));
                isMesh = displayType === GeometryDisplayType.OBJ;
                isPDB = displayType === GeometryDisplayType.PDB;

                if (url) {
                  _context.next = 9;
                  break;
                }

                // displayType not either pdb or obj, will show a sphere
                // TODO: handle CUBE, GIZMO etc
                _lookupKey = "".concat(id, "-").concat(displayType);
                geometry = this.createNewSphereGeometry(_lookupKey);
                this.setGeometryInRegistry(_lookupKey, geometry, GeometryDisplayType.SPHERE);
                return _context.abrupt("return", Promise.resolve({
                  geometry: geometry
                }));

              case 9:
                lookupKey = checkAndSanitizePath(url);

                if (!(isMesh || isPDB)) {
                  _context.next = 12;
                  break;
                }

                return _context.abrupt("return", this.attemptToLoadGeometry(lookupKey, displayType).then(function (geometry) {
                  if (geometry) {
                    return {
                      geometry: geometry
                    };
                  }
                })["catch"](function (e) {
                  // if anything goes wrong, add a new sphere to the registry
                  // using this same lookup key
                  var geometry = _this4.createNewSphereGeometry(lookupKey);

                  _this4.setGeometryInRegistry(lookupKey, geometry, GeometryDisplayType.SPHERE);

                  return Promise.resolve({
                    geometry: geometry,
                    displayType: GeometryDisplayType.SPHERE,
                    errorMessage: e
                  });
                }));

              case 12:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function mapKeyToGeom(_x, _x2) {
        return _mapKeyToGeom.apply(this, arguments);
      }

      return mapKeyToGeom;
    }()
  }]);

  return GeometryStore;
}();

export default GeometryStore;