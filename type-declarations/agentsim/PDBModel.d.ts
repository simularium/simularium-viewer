declare class PDBModel {
    filePath: string;
    name: string;
    pdb: any;
    private geometry;
    private particles;
    constructor(filePath: string);
    download(): Promise<void>;
    private checkChains;
    private createGPUBuffers;
}
export default PDBModel;
