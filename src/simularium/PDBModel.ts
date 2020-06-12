import parsePdb from "parse-pdb";
import {
    BufferGeometry,
    Float32BufferAttribute,
    Points,
    ShaderMaterial,
    Vector3,
} from "three";

import KMeans3d from "./rendering/KMeans3d";

class PDBModel {
    public filePath: string;
    public name: string;
    public pdb: any;
    private geometry: BufferGeometry[];
    private particles: Points[];
    private lods: Float32Array[];
    private lodSizes: number[];
    //private materials: ShaderMaterial[];

    public constructor(filePath: string) {
        this.filePath = filePath;
        this.name = filePath;
        this.pdb = null;
        this.particles = [];
        this.geometry = [];
        this.lods = [];
        this.lodSizes = [];
    }

    public download(): Promise<void> {
        const pdbRequest = new Request(this.filePath);
        const self = this;
        return fetch(pdbRequest)
            .then(response => response.text())
            .then(data => {
                // note pdb atom coordinates are in angstroms
                // 1 nm is 10 angstroms
                self.pdb = parsePdb(data);
                self.fixupCoordinates();
                console.log("PDB FILE HAS " + self.pdb.atoms.length + " ATOMS");
                self.checkChains();
                // TODO look at this when ready to do instancing refactor
                //self.createGPUBuffers();
                self.precomputeLOD();
            });
    }

    private fixupCoordinates() {
        const PDB_COORDINATE_SCALE = new Vector3(-0.1, 0.1, -0.1);

        for (var i = 0; i < this.pdb.atoms.length; ++i) {
            this.pdb.atoms[i].x *= PDB_COORDINATE_SCALE.x;
            this.pdb.atoms[i].y *= PDB_COORDINATE_SCALE.y;
            this.pdb.atoms[i].z *= PDB_COORDINATE_SCALE.z;
        }
    }

    private checkChains(): void {
        if (!this.pdb.chains) {
            this.pdb.chains = new Map();
        }
        if (!this.pdb.chains.size) {
            for (var i = 0; i < this.pdb.atoms.length; ++i) {
                const atom = this.pdb.atoms[i];
                if (!this.pdb.chains.get(atom.chainID)) {
                    this.pdb.chains.set(atom.chainID, {
                        id: this.pdb.chains.size,
                        chainID: atom.chainID,
                        // No need to save numRes, can just do chain.residues.length
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
                vertices[i * 4] = this.lods[i][j * 3];
                vertices[i * 4 + 1] = this.lods[i][j * 3 + 1];
                vertices[i * 4 + 2] = this.lods[i][j * 3 + 2];
                vertices[i * 4 + 3] = 1;
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
            const object = new Points(geometry);
            this.geometry.push(geometry);
            this.particles.push(object);
        }
    }

    private precomputeLOD() {
        const n = this.pdb.atoms.length;
        const atoms = this.pdb.atoms;

        this.lodSizes = [
            n,
            Math.floor(n / 8),
            Math.floor(n / 32),
            Math.floor(n / 128),
        ];
        this.lods = [new Float32Array(n * 3)];

        // fill LOD 0 with the raw points
        for (var i = 0; i < n; i++) {
            this.lods[0][i * 3] = this.pdb.atoms[i].x;
            this.lods[0][i * 3 + 1] = this.pdb.atoms[i].y;
            this.lods[0][i * 3 + 2] = this.pdb.atoms[i].z;
        }

        // compute the remaining LODs
        // should they each use the raw data or should they use the previous LOD?

        //console.profile("KMEANS" + this.name);
        const km30 = new KMeans3d({ k: this.lodSizes[1], data: this.lods[0] });
        this.lods.push(km30.means);
        const km31 = new KMeans3d({ k: this.lodSizes[2], data: this.lods[0] });
        this.lods.push(km31.means);
        const km32 = new KMeans3d({ k: this.lodSizes[3], data: this.lods[0] });
        this.lods.push(km32.means);
        //console.profileEnd("KMEANS" + this.name);
    }

    public getLod(lod) {
        return this.lods[lod];
    }
}

export default PDBModel;
