import * as Comlink from "comlink";
import parsePdb from "parse-pdb";
import { BufferGeometry, Float32BufferAttribute, Points, Vector3 } from "three";

import KMeans3d from "./rendering/KMeans3d";
import * as workerPath from "file-loader?name=[name].js!./KMeansWorker";
import { KMeansWorker } from "./KMeansWorker";

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

class PDBModel {
    public filePath: string;
    public name: string;
    public pdb: PDBType | null;
    private geometry: BufferGeometry[];
    private lods: Float32Array[];
    private lodSizes: number[];

    public constructor(filePath: string) {
        this.filePath = filePath;
        this.name = filePath;
        this.pdb = null;
        this.geometry = [];
        this.lods = [];
        this.lodSizes = [];
    }

    public download(url): Promise<void> {
        const pdbRequest = new Request(url);
        const self = this;
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
                self.pdb = parsePdb(data) as PDBType;
                if (self.pdb.atoms.length > 0) {
                    self.fixupCoordinates();
                    console.log(
                        "PDB FILE HAS " + self.pdb.atoms.length + " ATOMS"
                    );
                    self.checkChains();
                    self.precomputeLOD();
                    self.createGPUBuffers();
                }
            });
    }

    // build a fake random pdb
    public create(nAtoms: number, atomSpread: number = 10): void {
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
        this.precomputeLOD();
        this.createGPUBuffers();
    }

    private fixupCoordinates(): void {
        if (!this.pdb) {
            return;
        }
        const PDB_COORDINATE_SCALE = new Vector3(-0.1, 0.1, -0.1);

        for (var i = 0; i < this.pdb.atoms.length; ++i) {
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
            for (var i = 0; i < this.pdb.atoms.length; ++i) {
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

    private createGPUBuffers(): void {
        for (let i = 0; i < this.lods.length; ++i) {
            const geometry = new BufferGeometry();
            const n = this.lodSizes[i];
            const vertices = new Float32Array(n * 4);
            // residue ids? a RESIDUE belongs to a CHAIN
            //const residueIds = new Float32Array(n);
            // chain ids? a CHAIN has many RESIDUES
            //const chainIds = new Float32Array(n);
            for (let j = 0; j < n; j++) {
                // position
                vertices[j * 4] = this.lods[i][j * 3];
                vertices[j * 4 + 1] = this.lods[i][j * 3 + 1];
                vertices[j * 4 + 2] = this.lods[i][j * 3 + 2];
                vertices[j * 4 + 3] = 1;
                // residueIds[i] = this.pdb.atoms[i].resSeq; // resSeq might not be the right number here. might want the residue itself's index
                // const chain = this.pdb.chains.get(this.pdb.atoms[i].chainId);
                // chainIds[i] = chain ? chain.id : 0;
            }
            geometry.setAttribute(
                "position",
                new Float32BufferAttribute(vertices, 4)
            );
            // geometry.setAttribute(
            //     "vResidueId",
            //     new Float32BufferAttribute(residueIds, 1)
            // );
            // geometry.setAttribute(
            //     "vChainId",
            //     new Float32BufferAttribute(chainIds, 1)
            // );
            this.geometry.push(geometry);
        }
    }

    private precomputeLOD(): void {
        if (!this.pdb) {
            return;
        }
        const n = this.pdb.atoms.length;

        this.lodSizes = [
            n,
            Math.max(Math.floor(n / 8), 1),
            Math.max(Math.floor(n / 32), 1),
            Math.max(Math.floor(n / 128), 1),
        ];
        this.lods = [];

        // put all the points in a flat array
        const allData = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            allData[i * 3] = this.pdb.atoms[i].x;
            allData[i * 3 + 1] = this.pdb.atoms[i].y;
            allData[i * 3 + 2] = this.pdb.atoms[i].z;
        }

        // fill LOD 0 with the raw points
        this.lods.push(allData.slice());

        // compute the remaining LODs
        // should they each use the raw data or should they use the previous LOD?

        //console.profile("KMEANS" + this.name);
        const worker = new Worker(workerPath);
        const obj = Comlink.wrap<KMeansWorker>(worker);
        obj.run(
            this.lodSizes[1],
            Comlink.transfer(allData, [allData.buffer])
        ).then(retData => this.lods.push(retData));

        const km30 = new KMeans3d({ k: this.lodSizes[1], data: allData });
        this.lods.push(km30.means);
        const km31 = new KMeans3d({ k: this.lodSizes[2], data: allData });
        this.lods.push(km31.means);
        const km32 = new KMeans3d({ k: this.lodSizes[3], data: allData });
        this.lods.push(km32.means);
        //console.profileEnd("KMEANS" + this.name);
    }

    public instantiate(): Points[] {
        const lodobjects: Points[] = [];
        for (let i = 0; i < this.lods.length; ++i) {
            const obj = new Points(this.geometry[i]);
            obj.visible = false;
            lodobjects.push(obj);
        }
        return lodobjects;
    }
}

export default PDBModel;
