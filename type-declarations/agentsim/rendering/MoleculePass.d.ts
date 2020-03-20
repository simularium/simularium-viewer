import { BufferGeometry, ShaderMaterial, Points, Scene } from "three";
declare class MoleculePass {
    colorMaterial: ShaderMaterial;
    normalMaterial: ShaderMaterial;
    positionMaterial: ShaderMaterial;
    particles: Points;
    scene: Scene;
    geometry: BufferGeometry;
    constructor(n: any);
    createMoleculeBuffer(n: any): void;
    update(positions: any, typeIds: any, instanceIds: any, numVertices: any): void;
    setAtomRadius(r: any): void;
    resize(width: any, height: any): void;
    render(renderer: any, camera: any, colorBuffer: any, normalBuffer: any, positionBuffer: any): void;
}
export default MoleculePass;
