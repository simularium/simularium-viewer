import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { Mesh } from "three";
import { InstancedMesh, InstanceType } from "../visGeometry/rendering/InstancedMesh";
import GeometryStore, { DEFAULT_MESH_NAME } from "../visGeometry/GeometryStore";
import { GeometryDisplayType } from "../visGeometry/types";
import PDBModel from "../visGeometry/PDBModel";
describe("GeometryStore module", function () {
  test("it creates a registry with a single mesh", function () {
    var store = new GeometryStore();
    var registry = store.registry;
    expect(registry.get(DEFAULT_MESH_NAME)).toBeTruthy();
    expect(registry.size).toEqual(1);
  });
  describe("GeometryStore reset", function () {
    test("it clears out a registry", function () {
      var store = new GeometryStore();
      var registry = store.registry;
      var addedItem = "to-delete";
      registry.set(addedItem, {
        displayType: GeometryDisplayType.OBJ,
        geometry: {
          mesh: new Mesh(GeometryStore.sphereGeometry),
          cancelled: false,
          instances: new InstancedMesh(InstanceType.MESH, GeometryStore.sphereGeometry, addedItem, 1)
        }
      });
      expect(registry.get(addedItem)).toBeTruthy();
      expect(registry.size).toEqual(2);
      store.reset();
      expect(registry.get(DEFAULT_MESH_NAME)).toBeTruthy();
      expect(registry.get(addedItem)).toBeFalsy();
      expect(registry.size).toEqual(1);
    });
  });
  describe("GeometryStore forEachMesh", function () {
    test("it modifies each mesh object in registry", function () {
      var store = new GeometryStore();
      store.forEachMesh(function (geoMesh) {
        geoMesh.geometry.cancelled = true;
      });
      var registry = store.registry;
      var mesh = registry.get(DEFAULT_MESH_NAME);
      expect(mesh).toBeTruthy();

      if (mesh) {
        expect(mesh.geometry.cancelled).toBeTruthy();
      }
    });
    test("it wont modify PDBs", function () {
      var store = new GeometryStore();
      var registry = store.registry;
      var pdbName = "pdb.pdb";
      registry.set(pdbName, {
        displayType: GeometryDisplayType.PDB,
        geometry: new PDBModel(pdbName)
      });
      store.forEachMesh(function (geoMesh) {
        geoMesh.geometry.cancelled = true;
      });
      var mesh = registry.get(DEFAULT_MESH_NAME);
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
      var store = new GeometryStore();
      var mesh = store.getGeoForAgentType(DEFAULT_MESH_NAME);
      expect(mesh).toBeTruthy();
    });
    test("it will return a null if no geo exists", function () {
      var store = new GeometryStore();
      var mesh = store.getGeoForAgentType("no mesh");
      expect(mesh).toBeNull();
    });
  });
  describe("cancelAll", function () {
    test("it will change all geometries to cancelled", function () {
      var store = new GeometryStore();
      var registry = store.registry;
      var pdbName = "pdb.pdb";
      registry.set(pdbName, {
        displayType: GeometryDisplayType.PDB,
        geometry: new PDBModel(pdbName)
      });
      var addedItem = "mesh";
      registry.set(addedItem, {
        displayType: GeometryDisplayType.OBJ,
        geometry: {
          mesh: new Mesh(GeometryStore.sphereGeometry),
          cancelled: false,
          instances: new InstancedMesh(InstanceType.MESH, GeometryStore.sphereGeometry, addedItem, 1)
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
    test("it returns a sphere geometry after storing it in the registry", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      var store, id, returned, registry, savedMesh;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              store = new GeometryStore();
              id = 1;
              _context.next = 4;
              return store.mapKeyToGeom(id, {
                displayType: GeometryDisplayType.SPHERE,
                url: "",
                color: ""
              });

            case 4:
              returned = _context.sent;
              registry = store.registry;
              expect(returned).toBeTruthy();
              savedMesh = registry.get(GeometryDisplayType.SPHERE); // returned and saveMesh will always exist, but typeScript is uncertain
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
    test("it returns a cube geometry after storing it in the registry", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
      var store, id, returned, registry, savedMesh;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              store = new GeometryStore();
              id = 1;
              _context2.next = 4;
              return store.mapKeyToGeom(id, {
                displayType: GeometryDisplayType.CUBE,
                url: "",
                color: ""
              });

            case 4:
              returned = _context2.sent;
              registry = store.registry;
              expect(returned).toBeTruthy();
              savedMesh = registry.get(GeometryDisplayType.CUBE); // returned and saveMesh will always exist, but typeScript is uncertain
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
    test("if a request fails, returns a sphere with an error message", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
      var store, returned;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              store = new GeometryStore(); // TODO threejs' OBJLoader now uses the Request api under the hood, and Request is
              // not available in nodejs (the environment our tests run in) without a polyfill
              // such as node-fetch. I tried to add node-fetch here but I couldn't get it to work.

              _context3.next = 3;
              return store.mapKeyToGeom(1, {
                displayType: GeometryDisplayType.OBJ,
                url: "test",
                color: ""
              });

            case 3:
              returned = _context3.sent;
              expect(returned).toBeTruthy();

              if (returned) {
                expect(returned.displayType).toEqual(GeometryDisplayType.SPHERE);
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