declare class PDBModel {
    filePath: string;
    pdb: any;
    constructor(filePath: string);
    download(): Promise<void>;
}
export default PDBModel;
