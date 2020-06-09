import parsePdb from "parse-pdb";
import { BufferGeometry, Float32BufferAttribute, Points } from "three";

import KMeans from "./rendering/KMeans";
import KMeans3d from "./rendering/KMeans3d";

class PDBModel {
    public filePath: string;
    public name: string;
    public pdb: any;
    private geometry: BufferGeometry;
    private particles: Points;
    private lods: Float32Array[];
    private lodSizes: number[];

    public constructor(filePath: string) {
        this.filePath = filePath;
        this.name = filePath;
        this.pdb = null;
        this.particles = new Points();
        this.geometry = new BufferGeometry();
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
                console.log("PDB FILE HAS " + self.pdb.atoms.length + " ATOMS");
                self.checkChains();
                // TODO look at this when ready to do instancing refactor
                //self.createGPUBuffers();
                self.precomputeLOD();
            });
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
        // create gpu representation for this pdb
        this.geometry = new BufferGeometry();
        const n = this.pdb.atoms.length;
        var vertices = new Float32Array(n * 4);
        // residue ids? a RESIDUE belongs to a CHAIN
        var residueIds = new Float32Array(n);
        // chain ids? a CHAIN has many RESIDUES
        var chainIds = new Float32Array(n);
        for (var i = 0; i < n; i++) {
            // position
            vertices[i * 4] = this.pdb.atoms[i].x;
            vertices[i * 4 + 1] = this.pdb.atoms[i].y;
            vertices[i * 4 + 2] = this.pdb.atoms[i].z;
            vertices[i * 4 + 3] = 1;
            residueIds[i] = this.pdb.atoms[i].resSeq; // resSeq might not be the right number here. might want the residue itself's index
            const chain = this.pdb.chains.get(this.pdb.atoms[i].chainId);
            chainIds[i] = chain ? chain.id : 0;
        }
        this.geometry.setAttribute(
            "position",
            new Float32BufferAttribute(vertices, 4)
        );
        this.geometry.setAttribute(
            "vResidueId",
            new Float32BufferAttribute(residueIds, 1)
        );
        this.geometry.setAttribute(
            "vChainId",
            new Float32BufferAttribute(chainIds, 1)
        );
        this.particles = new Points(this.geometry);
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

        //var points: number[][] = []; //new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            // position
            // points.push([
            //     this.pdb.atoms[i].x,
            //     this.pdb.atoms[i].y,
            //     this.pdb.atoms[i].z,
            // ]);
            // points[i * 3] = this.pdb.atoms[i].x;
            // points[i * 3 + 1] = this.pdb.atoms[i].y;
            // points[i * 3 + 2] = this.pdb.atoms[i].z;
            this.lods[0][i * 3] = this.pdb.atoms[i].x;
            this.lods[0][i * 3 + 1] = this.pdb.atoms[i].y;
            this.lods[0][i * 3 + 2] = this.pdb.atoms[i].z;
        }
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
