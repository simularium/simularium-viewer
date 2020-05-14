import { BufferGeometry, Group, ShaderMaterial, Points, Scene } from "three";
declare class GBufferPass {
    colorMaterial: ShaderMaterial;
    normalMaterial: ShaderMaterial;
    positionMaterial: ShaderMaterial;
    colorMaterialMesh: ShaderMaterial;
    normalMaterialMesh: ShaderMaterial;
    positionMaterialMesh: ShaderMaterial;
    particles: Points;
    scene: Scene;
    geometry: BufferGeometry;
    agentMeshGroup: Group;
    agentFiberGroup: Group;
    private showAtoms;
    constructor(n: any);
    createMoleculeBuffer(n: any): void;
    setMeshGroups(agentMeshGroup: Group, agentFiberGroup: Group): void;
    setShowAtoms(show: boolean): void;
    getShowAtoms(): boolean;
    update(positions: any, typeIds: any, instanceIds: any, numVertices: any): void;
    setAtomRadius(r: any): void;
    resize(width: any, height: any): void;
    render(renderer: any, camera: any, colorBuffer: any, normalBuffer: any, positionBuffer: any): void;
}
export default GBufferPass;
