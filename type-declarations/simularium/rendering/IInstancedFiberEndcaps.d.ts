import { Color, Mesh } from "three";
interface IInstancedFiberEndcaps {
    create(n: number): void;
    getMesh(): Mesh;
    beginUpdate(nAgents: number): void;
    addInstance(x: number, y: number, z: number, scale: number, qx: number, qy: number, qz: number, qw: number, instanceId: number, typeId: number, c: Color): void;
    endUpdate(): void;
}
export default IInstancedFiberEndcaps;
