import { Mesh, Color } from "three";
import IInstancedFiberEndcaps from "./IInstancedFiberEndcaps";
declare class InstancedFiberEndcapsFallback implements IInstancedFiberEndcaps {
    private endcapGeometry;
    private fallbackMesh;
    private currentInstance;
    private isUpdating;
    constructor();
    create(n: number): void;
    getMesh(): Mesh;
    private updateInstanceCount;
    private reallocate;
    beginUpdate(nAgents: number): void;
    addInstance(x: number, y: number, z: number, scale: number, qx: number, qy: number, qz: number, qw: number, instanceId: number, typeId: number, c: Color): void;
    endUpdate(): void;
}
export default InstancedFiberEndcapsFallback;
