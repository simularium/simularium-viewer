import PDBModel from "../PDBModel";
import VisAgent from "../VisAgent";
import { BufferGeometry, Color, Camera, Scene } from "three";
declare class LegacyRenderer {
    private baseMaterial;
    private highlightMaterial;
    private followMaterial;
    private agentMeshGroup;
    constructor();
    beginUpdate(scene: Scene): void;
    addFiber(visAgent: VisAgent, scale: number, color: Color): void;
    private selectMaterial;
    private selectColor;
    addMesh(meshGeom: BufferGeometry, visAgent: VisAgent, scale: number, color: Color): void;
    addPdb(pdb: PDBModel, visAgent: VisAgent, color: Color, distances: number[]): void;
    endUpdate(scene: Scene): void;
    hitTest(coords: {
        x: number;
        y: number;
    }, camera: Camera): number;
}
export { LegacyRenderer };