"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _three = require("three");

var _InstancedMesh = require("../visGeometry/rendering/InstancedMesh");

var _GeometryStore = _interopRequireWildcard(require("../visGeometry/GeometryStore"));

var _types = require("../visGeometry/types");

var _PDBModel = _interopRequireDefault(require("../visGeometry/PDBModel"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

describe("GeometryStore module", function () {
  test("it creates a registry with a single mesh", function () {
    var store = new _GeometryStore["default"]();
    var registry = store.registry;
    expect(registry.get(_GeometryStore.DEFAULT_MESH_NAME)).toBeTruthy();
    expect(registry.size).toEqual(1);
  });
  describe("GeometryStore reset", function () {
    test("it clears out a registry", function () {
      var store = new _GeometryStore["default"]();
      var registry = store.registry;
      var addedItem = "to-delete";
      registry.set(addedItem, {
        displayType: _types.GeometryDisplayType.OBJ,
        geometry: {
          mesh: new _three.Mesh(_GeometryStore["default"].sphereGeometry),
          cancelled: false,
          instances: new _InstancedMesh.InstancedMesh(_InstancedMesh.InstanceType.MESH, _GeometryStore["default"].sphereGeometry, addedItem, 1)
        }
      });
      expect(registry.get(addedItem)).toBeTruthy();
      expect(registry.size).toEqual(2);
      store.reset();
      expect(registry.get(_GeometryStore.DEFAULT_MESH_NAME)).toBeTruthy();
      expect(registry.get(addedItem)).toBeFalsy();
      expect(registry.size).toEqual(1);
    });
  });
  describe("GeometryStore forEachMesh", function () {
    test("it modifies each mesh object in registry", function () {
      var store = new _GeometryStore["default"]();
      store.forEachMesh(function (geoMesh) {
        geoMesh.geometry.cancelled = true;
      });
      var registry = store.registry;
      var mesh = registry.get(_GeometryStore.DEFAULT_MESH_NAME);
      expect(mesh).toBeTruthy();

      if (mesh) {
        expect(mesh.geometry.cancelled).toBeTruthy();
      }
    });
    test("it wont modify PDBs", function () {
      var store = new _GeometryStore["default"]();
      var registry = store.registry;
      var pdbName = "pdb.pdb";
      registry.set(pdbName, {
        displayType: _types.GeometryDisplayType.PDB,
        geometry: new _PDBModel["default"](pdbName)
      });
      store.forEachMesh(function (geoMesh) {
        geoMesh.geometry.cancelled = true;
      });
      var mesh = registry.get(_GeometryStore.DEFAULT_MESH_NAME);
      expect(mesh).toBeTruthy();

      if (mesh) {
        expect(mesh.geometry.cancelled).toBeTruthy();
      }

      var pdb = registry.get(pdbName);
      expect(pdb).toBeTruthy();

      if (pdb) {
        expect(pdb.geometry.cancelled).toBeFalsy();
      }
    });
  });
  describe("getGeoForAgentType", function () {
    test("it will return a geo if it exists", function () {
      var store = new _GeometryStore["default"]();
      var mesh = store.getGeoForAgentType(_GeometryStore.DEFAULT_MESH_NAME);
      expect(mesh).toBeTruthy();
    });
    test("it will return a null if no geo exists", function () {
      var store = new _GeometryStore["default"]();
      var mesh = store.getGeoForAgentType("no mesh");
      expect(mesh).toBeNull();
    });
  });
  describe("cancelAll", function () {
    test("it will change all geometries to cancelled", function () {
      var store = new _GeometryStore["default"]();
      var registry = store.registry;
      var pdbName = "pdb.pdb";
      registry.set(pdbName, {
        displayType: _types.GeometryDisplayType.PDB,
        geometry: new _PDBModel["default"](pdbName)
      });
      var addedItem = "mesh";
      registry.set(addedItem, {
        displayType: _types.GeometryDisplayType.OBJ,
        geometry: {
          mesh: new _three.Mesh(_GeometryStore["default"].sphereGeometry),
          cancelled: false,
          instances: new _InstancedMesh.InstancedMesh(_InstancedMesh.InstanceType.MESH, _GeometryStore["default"].sphereGeometry, addedItem, 1)
        }
      });
      registry.forEach(function (value) {
        expect(value.geometry.cancelled).toBeFalsy();
      });
      store.cancelAll();
      registry.forEach(function (value) {
        expect(value.geometry.cancelled).toBeTruthy();
      });
    });
  });
  describe("mapKeyToGeom", function () {
    test("it returns a sphere geometry after storing it in the registry", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var store, id, returned, registry, savedMesh;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              store = new _GeometryStore["default"]();
              id = 1;
              _context.next = 4;
              return store.mapKeyToGeom(id, {
                displayType: _types.GeometryDisplayType.SPHERE,
                url: "",
                color: ""
              });

            case 4:
              returned = _context.sent;
              registry = store.registry;
              expect(returned).toBeTruthy();
              savedMesh = registry.get(_types.GeometryDisplayType.SPHERE); // returned and saveMesh will always exist, but typeScript is uncertain
              // hence this if statement

              if (returned && savedMesh) {
                expect(returned.geometry).toEqual(savedMesh.geometry);
                expect(returned.displayType).toBeFalsy();
                expect(returned.errorMessage).toBeFalsy();
              }

            case 9:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));
    test("it returns a cube geometry after storing it in the registry", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var store, id, returned, registry, savedMesh;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              store = new _GeometryStore["default"]();
              id = 1;
              _context2.next = 4;
              return store.mapKeyToGeom(id, {
                displayType: _types.GeometryDisplayType.CUBE,
                url: "",
                color: ""
              });

            case 4:
              returned = _context2.sent;
              registry = store.registry;
              expect(returned).toBeTruthy();
              savedMesh = registry.get(_types.GeometryDisplayType.CUBE); // returned and saveMesh will always exist, but typeScript is uncertain
              // hence this if statement

              if (returned && savedMesh) {
                expect(returned.geometry).toEqual(savedMesh.geometry);
                expect(returned.displayType).toBeFalsy();
                expect(returned.errorMessage).toBeFalsy();
              }

            case 9:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })));
    test("if a request fails, returns a sphere with an error message", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var store, returned;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              store = new _GeometryStore["default"](); // TODO threejs' OBJLoader now uses the Request api under the hood, and Request is
              // not available in nodejs (the environment our tests run in) without a polyfill
              // such as node-fetch. I tried to add node-fetch here but I couldn't get it to work.

              _context3.next = 3;
              return store.mapKeyToGeom(1, {
                displayType: _types.GeometryDisplayType.OBJ,
                url: "test",
                color: ""
              });

            case 3:
              returned = _context3.sent;
              expect(returned).toBeTruthy();

              if (returned) {
                expect(returned.displayType).toEqual(_types.GeometryDisplayType.SPHERE);
                expect(returned.errorMessage).toEqual("Failed to load mesh: /test");
              }

            case 6:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    })));
  });
});