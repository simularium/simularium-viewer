import "regenerator-runtime/runtime";
import { Points } from "three";
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
declare class PDBModel {
    filePath: string;
    name: string;
    pdb: PDBType | null;
    private lodSizes;
    private lods;
    private bounds;
    private cancelled;
    constructor(filePath: string);
    setCancelled(): void;
    isCancelled(): boolean;
    getNumAtoms(): number;
    download(url: string): Promise<void>;
    create(nAtoms: number, atomSpread?: number): Promise<void>;
    private fixupCoordinates;
    private checkChains;
    private createGPUBuffer;
    private makeFlatPositionArray;
    private initializeLOD;
    generateLOD(): Promise<void>;
    instantiate(): Points[];
    private processPdbLod;
}
export default PDBModel;
