import "regenerator-runtime/runtime";

import * as Comlink from "comlink";
import parsePdb from "parse-pdb";
import { BufferGeometry, Float32BufferAttribute, Points, Vector3 } from "three";

import KMeansWorkerModule from "./worker/KMeansWorker";
import { KMeansWorkerType } from "./worker/KMeansWorker";

const MAX_PDB_WORKERS = 4;

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
};

class PDBModel {
    public filePath: string;
    public name: string;
    public pdb: PDBType | null;
    private lods: LevelOfDetail[];
    private static numLiveWorkers = 0;

    public constructor(filePath: string) {
        this.filePath = filePath;
        this.name = filePath;
        this.pdb = null;
        this.lods = [];
    }

    public download(url: string): Promise<void> {
        const pdbRequest = new Request(url);
        return fetch(pdbRequest)
            .then(response => {
                if (!response.ok) {
                    throw new Error(
                        `Error fetching ${this.filePath} from ${url}`
                    );
                }
                return response.text();
            })
            .then(data => {
                // note pdb atom coordinates are in angstroms
                // 1 nm is 10 angstroms
                this.pdb = parsePdb(data) as PDBType;
                if (this.pdb.atoms.length > 0) {
                    this.fixupCoordinates();
                    console.log(
                        "PDB FILE HAS " + this.pdb.atoms.length + " ATOMS"
                    );
                    this.checkChains();
                    return this.setupGeometry();
                }
            });
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
        return this.setupGeometry();
    }

    private fixupCoordinates(): void {
        if (!this.pdb) {
            return;
        }
        const PDB_COORDINATE_SCALE = new Vector3(-0.1, 0.1, -0.1);

        for (let i = 0; i < this.pdb.atoms.length; ++i) {
            this.pdb.atoms[i].x *= PDB_COORDINATE_SCALE.x;
            this.pdb.atoms[i].y *= PDB_COORDINATE_SCALE.y;
            this.pdb.atoms[i].z *= PDB_COORDINATE_SCALE.z;
        }
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

    private async setupGeometry(): Promise<void> {
        if (!this.pdb) {
            console.log("setupgeometry called with no pdb data");
            return Promise.resolve();
        }
        const n = this.pdb.atoms.length;

        // put all the points in a flat array
        const allData = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            allData[i * 3] = this.pdb.atoms[i].x;
            allData[i * 3 + 1] = this.pdb.atoms[i].y;
            allData[i * 3 + 2] = this.pdb.atoms[i].z;
        }

        // fill LOD 0 with the raw points
        const lod0 = allData.slice();
        const geometry0 = this.createGPUBuffer(lod0);
        this.lods.push({ geometry: geometry0, vertices: lod0 });

        const sizes: number[] = [
            Math.max(Math.floor(n / 8), 1),
            Math.max(Math.floor(n / 32), 1),
            Math.max(Math.floor(n / 128), 1),
        ];

        if (PDBModel.numLiveWorkers >= MAX_PDB_WORKERS) {
            console.error(
                "Can not process PDB levels of detail; too many concurrent workers in flight"
            );
            // use full geometry for each LOD.
            for (let i = 0; i < sizes.length; ++i) {
                this.lods.push({
                    geometry: geometry0,
                    vertices: lod0,
                });
            }
            return Promise.resolve();
        }

        // compute the remaining LODs asynchronously.
        // TODO: try to allow updating one by one instead of waiting for all to complete.

        PDBModel.numLiveWorkers++;

        const worker = new KMeansWorkerModule();
        const kMeansWorkerClass = Comlink.wrap<KMeansWorkerType>(worker);
        const workerobj = await new kMeansWorkerClass();

        const retData = await workerobj.run(
            n,
            sizes,
            Comlink.transfer(allData, [allData.buffer])
        );

        // the worker is done
        PDBModel.numLiveWorkers--;

        // update the new LODs
        for (let i = 0; i < sizes.length; ++i) {
            this.lods.push({
                geometry: this.createGPUBuffer(retData[i]),
                vertices: retData[i],
            });
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
}

export default PDBModel;
