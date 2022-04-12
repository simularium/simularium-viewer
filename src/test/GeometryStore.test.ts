import { Mesh } from "three";

import {
    InstancedMesh,
    InstanceType,
} from "../visGeometry/rendering/InstancedMesh";
import GeometryStore, { DEFAULT_MESH_NAME } from "../visGeometry/GeometryStore";
import { GeometryDisplayType } from "../visGeometry/types";
import PDBModel from "../visGeometry/PDBModel";

describe("GeometryStore module", () => {
    test("it creates a registry with a single mesh", () => {
        const store = new GeometryStore();
        const registry = store.registry;
        expect(registry.get(DEFAULT_MESH_NAME)).toBeTruthy();
        expect(registry.size).toEqual(1);
    });
    describe("GeometryStore reset", () => {
        test("it clears out a registry", () => {
            const store = new GeometryStore();
            const registry = store.registry;
            const addedItem = "to-delete";
            registry.set(addedItem, {
                displayType: GeometryDisplayType.OBJ,
                geometry: {
                    mesh: new Mesh(GeometryStore.sphereGeometry),
                    cancelled: false,
                    instances: new InstancedMesh(
                        InstanceType.MESH,
                        GeometryStore.sphereGeometry,
                        addedItem,
                        1
                    ),
                },
            });
            expect(registry.get(addedItem)).toBeTruthy();
            expect(registry.size).toEqual(2);
            store.reset();
            expect(registry.get(DEFAULT_MESH_NAME)).toBeTruthy();
            expect(registry.get(addedItem)).toBeFalsy();
            expect(registry.size).toEqual(1);
        });
    });
    describe("GeometryStore forEachMesh", () => {
        test("it modifies each mesh object in registry", () => {
            const store = new GeometryStore();
            store.forEachMesh((geoMesh) => {
                geoMesh.geometry.cancelled = true;
            });
            const registry = store.registry;
            const mesh = registry.get(DEFAULT_MESH_NAME);
            expect(mesh).toBeTruthy();
            if (mesh) {
                expect(mesh.geometry.cancelled).toBeTruthy();
            }
        });
        test("it wont modify PDBs", () => {
            const store = new GeometryStore();
            const registry = store.registry;
            const pdbName = "pdb.pdb";
            registry.set(pdbName, {
                displayType: GeometryDisplayType.PDB,
                geometry: new PDBModel(pdbName),
            });
            store.forEachMesh((geoMesh) => {
                geoMesh.geometry.cancelled = true;
            });
            const mesh = registry.get(DEFAULT_MESH_NAME);
            expect(mesh).toBeTruthy();
            if (mesh) {
                expect(mesh.geometry.cancelled).toBeTruthy();
            }
            const pdb = registry.get(pdbName);
            expect(pdb).toBeTruthy();
            if (pdb) {
                expect(pdb.geometry.cancelled).toBeFalsy();
            }
        });
    });
    describe("getGeoForAgentType", () => {
        test("it will return a geo if it exists", () => {
            const store = new GeometryStore();
            const mesh = store.getGeoForAgentType(DEFAULT_MESH_NAME);
            expect(mesh).toBeTruthy();
        });
        test("it will return a null if no geo exists", () => {
            const store = new GeometryStore();
            const mesh = store.getGeoForAgentType("no mesh");
            expect(mesh).toBeNull();
        });
    });
    describe("cancelAll", () => {
        test("it will change all geometries to cancelled", () => {
            const store = new GeometryStore();
            const registry = store.registry;
            const pdbName = "pdb.pdb";
            registry.set(pdbName, {
                displayType: GeometryDisplayType.PDB,
                geometry: new PDBModel(pdbName),
            });
            const addedItem = "mesh";
            registry.set(addedItem, {
                displayType: GeometryDisplayType.OBJ,
                geometry: {
                    mesh: new Mesh(GeometryStore.sphereGeometry),
                    cancelled: false,
                    instances: new InstancedMesh(
                        InstanceType.MESH,
                        GeometryStore.sphereGeometry,
                        addedItem,
                        1
                    ),
                },
            });
            registry.forEach((value) => {
                expect(value.geometry.cancelled).toBeFalsy();
            });
            store.cancelAll();
            registry.forEach((value) => {
                expect(value.geometry.cancelled).toBeTruthy();
            });
        });
    });
    describe("mapKeyToGeom", () => {
        test("it returns a sphere geometry after storing it in the registry", async () => {
            const store = new GeometryStore();
            const id = 1;
            const returned = await store.mapKeyToGeom(id, {
                displayType: GeometryDisplayType.SPHERE,
                url: "",
                color: "",
            });
            const registry = store.registry;

            expect(returned).toBeTruthy();
            const savedMesh = registry.get(GeometryDisplayType.SPHERE);
            // returned and saveMesh will always exist, but typeScript is uncertain
            // hence this if statement
            if (returned && savedMesh) {
                expect(returned.geometry).toEqual(savedMesh.geometry);
                expect(returned.displayType).toBeFalsy();
                expect(returned.errorMessage).toBeFalsy();
            }
        });
        test("it returns a cube geometry after storing it in the registry", async () => {
            const store = new GeometryStore();
            const id = 1;
            const returned = await store.mapKeyToGeom(id, {
                displayType: GeometryDisplayType.CUBE,
                url: "",
                color: "",
            });
            const registry = store.registry;

            expect(returned).toBeTruthy();
            const savedMesh = registry.get(GeometryDisplayType.CUBE);
            // returned and saveMesh will always exist, but typeScript is uncertain
            // hence this if statement
            if (returned && savedMesh) {
                expect(returned.geometry).toEqual(savedMesh.geometry);
                expect(returned.displayType).toBeFalsy();
                expect(returned.errorMessage).toBeFalsy();
            }
        });
        test("if a request fails, returns a sphere with an error message", async () => {
            const store = new GeometryStore();
            // TODO threejs' OBJLoader now uses the Request api under the hood, and Request is
            // not available in nodejs (the environment our tests run in) without a polyfill
            // such as node-fetch. I tried to add node-fetch here but I couldn't get it to work.
            const returned = await store.mapKeyToGeom(1, {
                displayType: GeometryDisplayType.OBJ,
                url: "test",
                color: "",
            });

            expect(returned).toBeTruthy();
            if (returned) {
                expect(returned.displayType).toEqual(
                    GeometryDisplayType.SPHERE
                );
                expect(returned.errorMessage).toEqual(
                    "Failed to load mesh: /test"
                );
            }
        });
    });
});
