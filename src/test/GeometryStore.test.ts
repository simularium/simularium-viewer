import { Mesh } from "three";

import {
    InstancedMesh,
    InstanceType,
} from "../simularium/VisGeometry/rendering/InstancedMesh";
import VisAgent from "../simularium/VisGeometry/VisAgent";
import GeometryStore, {
    DEFAULT_MESH_NAME,
} from "../simularium/VisGeometry/GeometryStore";
import { GeometryDisplayType } from "../simularium/VisGeometry/types";
import PDBModel from "../simularium/VisGeometry/PDBModel";

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
                    mesh: new Mesh(VisAgent.sphereGeometry),
                    cancelled: false,
                    instances: new InstancedMesh(
                        InstanceType.MESH,
                        VisAgent.sphereGeometry,
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
            const cifName = "pdb.cif";
            registry.set(cifName, {
                displayType: GeometryDisplayType.CIF,
                geometry: new PDBModel(cifName),
            });
            const addedItem = "mesh";
            registry.set(addedItem, {
                displayType: GeometryDisplayType.OBJ,
                geometry: {
                    mesh: new Mesh(VisAgent.sphereGeometry),
                    cancelled: false,
                    instances: new InstancedMesh(
                        InstanceType.MESH,
                        VisAgent.sphereGeometry,
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
            const savedMesh = registry.get(
                `${id}-${GeometryDisplayType.SPHERE}`
            );
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
