import parsePdb from "parse-pdb";
import { BufferGeometry, Float32BufferAttribute, Points } from "three";

class PDBModel {
    public filePath: string;
    public name: string;
    public pdb: any;
    private geometry: BufferGeometry;
    private particles: Points;

    public constructor(filePath: string) {
        this.filePath = filePath;
        this.name = filePath;
        this.pdb = null;
        this.particles = new Points();
        this.geometry = new BufferGeometry();
    }

    public download() {
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
                self.createGPUBuffers();
            });
    }

    private checkChains() {
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

    private createGPUBuffers() {
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
}

export default PDBModel;
