import parsePdb from "parse-pdb";

class PDBModel {
    public filePath: string;
    public pdb: any;

    public constructor(filePath: string) {
        this.filePath = filePath;
        this.pdb = null;
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
            });
    }
}

export default PDBModel;
