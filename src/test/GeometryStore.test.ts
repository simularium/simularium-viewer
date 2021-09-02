import { InstancedMesh } from "../simularium/rendering/InstancedMesh";
import { Mesh } from "three";

import VisAgent from "../simularium/VisAgent";
import GeometryStore, {
    DEFAULT_MESH_NAME,
} from "../simularium/VisGeometry/GeometryStore";
import { GeometryDisplayType } from "../simularium/VisGeometry/types";
import PDBModel from "../simularium/PDBModel";

describe("GeometryStore module", () => {
    describe("GeometryStore init", () => {
        test("it creates a registry with a single mesh", () => {
            const store = new GeometryStore();
            store.init();
            const registry = store.registry;

            expect(registry.get(DEFAULT_MESH_NAME)).toBeTruthy();

            expect(registry.size).toEqual(1);
        });
        test("it creates clears out a registry", () => {
            const store = new GeometryStore();
            store.init();
            const registry = store.registry;
            const addedItem = "to-delete";
            registry.set(addedItem, {
                displayType: GeometryDisplayType.OBJ,
                geometry: {
                    mesh: new Mesh(VisAgent.sphereGeometry),
                    cancelled: false,
                    instances: new InstancedMesh(
                        VisAgent.sphereGeometry,
                        addedItem,
                        1
                    ),
                },
            });
            expect(registry.get(addedItem)).toBeTruthy();
            expect(registry.size).toEqual(2);
            store.init();
            expect(registry.get(DEFAULT_MESH_NAME)).toBeTruthy();
            expect(registry.get(addedItem)).toBeFalsy();
            expect(registry.size).toEqual(1);
        });
    });
    describe("GeometryStore forEachMesh", () => {
        test("it modifies each mesh object in registry", () => {
            const store = new GeometryStore();
            store.init();
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
            store.init();
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
            store.init();
            const mesh = store.getGeoForAgentType(DEFAULT_MESH_NAME);
            expect(mesh).toBeTruthy();
        });
        test("it will return a geo if it exists", () => {
            const store = new GeometryStore();
            store.init();
            const mesh = store.getGeoForAgentType(DEFAULT_MESH_NAME);
            expect(mesh).toBeTruthy();
        });
        test("it will return a null if no geo exists", () => {
            const store = new GeometryStore();
            store.init();
            const mesh = store.getGeoForAgentType("no mesh");
            expect(mesh).toBeNull();
        });
    });
    describe("cancelAll", () => {
        test("it will change all geometries to cancelled", () => {
            const store = new GeometryStore();
            store.init();
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
                    mesh: new Mesh(VisAgent.sphereGeometry),
                    cancelled: false,
                    instances: new InstancedMesh(
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
            store.init();
            const returned = await store.mapKeyToGeom(1, {
                displayType: GeometryDisplayType.SPHERE,
                url: "",
                color: "",
            });
            const registry = store.registry;

            expect(returned).toBeTruthy();
            const savedMesh = registry.get("1-SPHERE");
            if (returned && savedMesh) {
                expect(returned.geometry).toEqual(savedMesh.geometry);
                expect(returned.displayType).toBeFalsy();
                expect(returned.displayType).toBeFalsy();
            }
        });
    });
});
