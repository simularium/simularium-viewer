import "regenerator-runtime/runtime";

import * as Comlink from "comlink";
import parsePdb from "parse-pdb";
import { getObject } from "./cifparser";
import {
    Box3,
    BufferGeometry,
    Float32BufferAttribute,
    Points,
    Vector3,
} from "three";

import { KMeansWorkerType } from "./KMeansWorker";

import KMeans from "./rendering/KMeans3d";
import TaskQueue from "../simularium/TaskQueue";
import { InstancedMesh, InstanceType } from "./rendering/InstancedMesh";

interface PDBAtom {
    serial?: number;
    name?: string;
    altLoc?: string;
    resName?: string;
    chainID?: string;
    resSeq?: number;
    iCode?: string;
    x: number;
    y: number;
    z: number;
    occupancy?: number;
    tempFactor?: number;
    element?: string;
    charge?: string;
}
interface PDBSeqRes {
    serNum: number;
    chainID: string;
    numRes: number;
    resNames: string[];
}
interface PDBResidue {
    id: number;
    serNum: number;
    chainID: string;
    resName: string;
    atoms: PDBAtom[];
}
interface PDBChain {
    id: number;
    chainID: string;
    residues: PDBResidue[];
}

interface PDBType {
    atoms: PDBAtom[];
    seqRes: PDBSeqRes[];
    residues: PDBResidue[];
    chains: Map<string, PDBChain>;
}

type LevelOfDetail = {
    geometry: BufferGeometry;
    vertices: Float32Array;
    instances: InstancedMesh;
};

class PDBModel {
    public filePath: string;
    public name: string;
    public pdb: PDBType | null;
    // number of atoms for each level of detail
    private lodSizes: number[];
    private lods: LevelOfDetail[];
    private bounds: Box3;
    // cancelled means we have abandoned this pdb
    // and if it is still initializing, it should be dropped/ignored as soon as processing is done
    private _cancelled: boolean;

    public constructor(filePath: string) {
        this.filePath = filePath;
        this.name = filePath;
        this.pdb = null;
        this.lods = [];
        this.lodSizes = [];
        this._cancelled = false;
        this.bounds = new Box3();
    }

    public set cancelled(cancelled: boolean) {
        this._cancelled = cancelled;
    }

    public get cancelled(): boolean {
        return this._cancelled;
    }

    public getNumAtoms(): number {
        return this.pdb ? this.pdb.atoms.length : 0;
    }

    public parse(data: string, fileExtension: string): void {
        // It would be great if we could distinguish the formats only from the data content.
        // Files from the PDB seem to follow this convention:
        // .pdb files start with "HEADER"
        // .cif files start with "data_"
        // but we have encountered other .pdb files that do not begin with "HEADER".
        if (fileExtension === "pdb") {
            this.parsePDBData(data);
        } else if (fileExtension === "cif") {
            this.parseCIFData(data);
        } else {
            // Error will be caught by the Geometry store handling
            throw new Error(
                `Expected .cif or .pdb file extension to parse PDB data, but got ${fileExtension}`
            );
        }
    }

    private parseCIFData(data: string): void {
        interface AtomSite {
            ["Cartn_x"]: number;
            ["Cartn_y"]: number;
            ["Cartn_z"]: number;
        }
        const parsedpdb: Record<string, unknown> = getObject(data);
        for (const obj in parsedpdb) {
            const mypdb = parsedpdb[obj];
            const atomSites = (mypdb as Record<string, unknown>)[
                "_atom_site"
            ] as AtomSite[];
            if (atomSites.length > 0) {
                this.pdb = {
                    atoms: [] as PDBAtom[],
                    seqRes: [],
                    residues: [],
                    chains: new Map(),
                };
                this.pdb.atoms = [];
                for (let i = 0; i < atomSites.length; ++i) {
                    this.pdb?.atoms.push({
                        x: atomSites[i].Cartn_x,
                        y: atomSites[i].Cartn_y,
                        z: atomSites[i].Cartn_z,
                    });
                }
                this.fixupCoordinates();
                console.log(
                    `PDB ${this.name} has ${this.pdb.atoms.length} atoms`
                );
                this.checkChains();
                return this.initializeLOD();
            }
            break;
        }
    }

    private parsePDBData(data: string): void {
        // NOTE: pdb atom coordinates are in angstroms
        // 1 nm is 10 angstroms
        this.pdb = parsePdb(data) as PDBType;
        if (this.pdb.atoms.length > 0) {
            this.fixupCoordinates();
            console.log(`PDB ${this.name} has ${this.pdb.atoms.length} atoms`);
            this.checkChains();
            return this.initializeLOD();
        }
    }

    // build a fake random pdb
    public create(nAtoms: number, atomSpread = 10): Promise<void> {
        const atoms: PDBAtom[] = [];
        // always put one atom at the center
        atoms.push({
            x: 0,
            y: 0,
            z: 0,
        });
        for (let i = 1; i < nAtoms; ++i) {
            atoms.push({
                x: (Math.random() - 0.5) * atomSpread,
                y: (Math.random() - 0.5) * atomSpread,
                z: (Math.random() - 0.5) * atomSpread,
            });
        }
        this.pdb = {
            atoms: atoms,
            seqRes: [],
            residues: [],
            chains: new Map(),
        };
        this.fixupCoordinates();
        this.initializeLOD();
        return Promise.resolve();
    }

    private fixupCoordinates(): void {
        if (!this.pdb) {
            return;
        }
        // PDB Angstroms to Simularium nanometers
        const PDB_COORDINATE_SCALE = new Vector3(0.1, 0.1, 0.1);

        for (let i = 0; i < this.pdb.atoms.length; ++i) {
            this.pdb.atoms[i].x *= PDB_COORDINATE_SCALE.x;
            this.pdb.atoms[i].y *= PDB_COORDINATE_SCALE.y;
            this.pdb.atoms[i].z *= PDB_COORDINATE_SCALE.z;
        }

        // compute bounds:
        let minx = this.pdb.atoms[0].x;
        let miny = this.pdb.atoms[0].x;
        let minz = this.pdb.atoms[0].x;
        let maxx = this.pdb.atoms[0].x;
        let maxy = this.pdb.atoms[0].x;
        let maxz = this.pdb.atoms[0].x;
        for (let i = 1; i < this.pdb.atoms.length; ++i) {
            maxx = Math.max(maxx, this.pdb.atoms[i].x);
            maxy = Math.max(maxy, this.pdb.atoms[i].y);
            maxz = Math.max(maxz, this.pdb.atoms[i].z);
            minx = Math.min(minx, this.pdb.atoms[i].x);
            miny = Math.min(miny, this.pdb.atoms[i].y);
            minz = Math.min(minz, this.pdb.atoms[i].z);
        }
        this.bounds = new Box3(
            new Vector3(minx, miny, minz),
            new Vector3(maxx, maxy, maxz)
        );
    }

    private checkChains(): void {
        if (!this.pdb) {
            return;
        }
        if (!this.pdb.chains) {
            this.pdb.chains = new Map();
        }
        if (!this.pdb.chains.size) {
            for (let i = 0; i < this.pdb.atoms.length; ++i) {
                const atom = this.pdb.atoms[i];
                if (atom.chainID && !this.pdb.chains.get(atom.chainID)) {
                    this.pdb.chains.set(atom.chainID, {
                        id: this.pdb.chains.size,
                        chainID: atom.chainID,
                        // No need to save numRes, can just do chain.residues.length
                        residues: [],
                    });
                }
            }
        }
    }

    private createGPUBuffer(coordinates): BufferGeometry {
        const geometry = new BufferGeometry();
        const n = coordinates.length / 3;
        const vertices = new Float32Array(n * 4);
        // FUTURE: Add residue and chain information when we want it to matter for display
        for (let j = 0; j < n; j++) {
            vertices[j * 4] = coordinates[j * 3];
            vertices[j * 4 + 1] = coordinates[j * 3 + 1];
            vertices[j * 4 + 2] = coordinates[j * 3 + 2];
            vertices[j * 4 + 3] = 1;
        }
        geometry.setAttribute(
            "position",
            new Float32BufferAttribute(vertices, 4)
        );
        return geometry;
    }

    private makeFlatPositionArray(): Float32Array {
        if (!this.pdb) {
            console.error("makeFlatPositionArray: pdb not loaded yet");
            return new Float32Array();
        }

        const n = this.pdb.atoms.length;

        // put all the points in a flat array
        const allData = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            allData[i * 3] = this.pdb.atoms[i].x;
            allData[i * 3 + 1] = this.pdb.atoms[i].y;
            allData[i * 3 + 2] = this.pdb.atoms[i].z;
        }
        return allData;
    }

    private initializeLOD(): void {
        if (!this.pdb) {
            console.error("initializeLOD called with no pdb data");
            return;
        }
        const n = this.pdb.atoms.length;

        // levels of detail go from most detailed to least
        this.lodSizes = [
            n,
            Math.max(Math.floor(n / 8), 1),
            Math.max(Math.floor(n / 32), 1),
            Math.max(Math.floor(n / 128), 1),
        ];

        // select random points for the initial quick LOD guess.
        // alternative strategy:
        // for small atom counts, apply kmeans synchronously

        // put all the points in a flat array
        const allData = this.makeFlatPositionArray();

        // fill LOD 0 with the raw points
        const lod0 = allData.slice();
        const geometry0 = this.createGPUBuffer(lod0);
        this.lods.push({
            geometry: geometry0,
            vertices: lod0,
            instances: new InstancedMesh(
                InstanceType.POINTS,
                geometry0,
                this.name + "_LOD0",
                0
            ),
        });
        // start at 1, and add the rest
        for (let i = 1; i < this.lodSizes.length; ++i) {
            const lodData = KMeans.randomSeeds(this.lodSizes[i], allData);
            const geometry = this.createGPUBuffer(lodData);
            this.lods.push({
                geometry: geometry,
                vertices: lodData,
                instances: new InstancedMesh(
                    InstanceType.POINTS,
                    geometry,
                    this.name + "_LOD" + i,
                    0
                ),
            });
        }
    }

    public async generateLOD(): Promise<void> {
        if (!this.pdb || this.lods.length < 4) {
            console.log(
                "generateLOD called with no pdb data or uninitialized LODs"
            );
            return Promise.resolve();
        }

        const n = this.pdb.atoms.length;

        // put all the points in a flat array
        const allData = this.makeFlatPositionArray();

        const sizes: number[] = this.lodSizes.slice(1);

        // Enqueue this LOD calculation
        const retData: Float32Array[] = await TaskQueue.enqueue<Float32Array[]>(
            () => this.processPdbLod(n, sizes, allData)
        );
        // ... continue on when it's done

        // update the new LODs
        for (let i = 0; i < sizes.length; ++i) {
            const lodIndex = i + 1;
            // if old LOD existed we can dispose now.
            if (this.lods[lodIndex]) {
                this.lods[lodIndex].instances.dispose();
            }
            const geometry = this.createGPUBuffer(retData[i]);
            this.lods[lodIndex] = {
                geometry: geometry,
                vertices: retData[i],
                instances: new InstancedMesh(
                    InstanceType.POINTS,
                    geometry,
                    this.name + "_LOD" + lodIndex,
                    0
                ),
            };
        }
    }

    public numLODs(): number {
        return this.lods.length;
    }

    public getLOD(index: number): InstancedMesh {
        if (index < 0 || index >= this.lods.length) {
            index = this.lods.length - 1;
        }
        return this.lods[index].instances;
    }

    public beginUpdate(): void {
        for (let i = 0; i < this.lods.length; ++i) {
            this.lods[i].instances.beginUpdate();
        }
    }

    public endUpdate(): void {
        for (let i = 0; i < this.lods.length; ++i) {
            this.lods[i].instances.endUpdate();
        }
    }

    public instantiate(): Points[] {
        const lodobjects: Points[] = [];
        for (let i = 0; i < this.lods.length; ++i) {
            const obj = new Points(this.lods[i].geometry);
            obj.visible = false;
            lodobjects.push(obj);
        }
        return lodobjects;
    }

    private async processPdbLod(n, sizes, allData) {
        // https://webpack.js.org/guides/web-workers/#syntax
        const worker = new Worker(
            new URL("./KMeansWorker.ts", import.meta.url)
        );
        const kMeansWorkerClass = Comlink.wrap<KMeansWorkerType>(worker);
        const workerobj = await new kMeansWorkerClass();

        const retData = await workerobj.run(
            n,
            sizes,
            Comlink.transfer(allData, [allData.buffer])
        );

        worker.terminate();
        return retData;
    }
}

export default PDBModel;
