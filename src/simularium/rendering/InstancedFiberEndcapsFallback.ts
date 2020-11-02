import {
    SphereBufferGeometry,
    InstancedMesh,
    Mesh,
    MeshLambertMaterial,
    Matrix4,
    Vector3,
    Quaternion,
    Color,
} from "three";
import IInstancedFiberEndcaps from "./IInstancedFiberEndcaps";

class InstancedFiberEndcapsFallback implements IInstancedFiberEndcaps {
    private endcapGeometry: SphereBufferGeometry;
    private fallbackMesh: InstancedMesh;
    private currentInstance: number;
    private isUpdating: boolean;

    constructor() {
        this.currentInstance = 0;
        this.isUpdating = false;
        this.endcapGeometry = new SphereBufferGeometry(1, 8, 8);
        this.fallbackMesh = new InstancedMesh(
            this.endcapGeometry,
            new MeshLambertMaterial(),
            0
        );
    }

    public create(n: number): void {
        this.fallbackMesh = new InstancedMesh(
            this.endcapGeometry,
            new MeshLambertMaterial(),
            n
        );
    }

    public getMesh(): Mesh {
        return this.fallbackMesh;
    }

    private updateInstanceCount(n: number): void {
        this.fallbackMesh.count = n;
    }

    private reallocate(n: number): void {
        this.fallbackMesh = new InstancedMesh(
            this.endcapGeometry,
            new MeshLambertMaterial(),
            n
        );
    }

    beginUpdate(nAgents: number): void {
        // do we need to increase storage?
        const increment = 4096;
        const currentNumInstances =
            this.fallbackMesh.instanceMatrix.array.length / 16;
        const requestedNumInstances = nAgents * 2;
        // two instances per agent.
        if (requestedNumInstances > currentNumInstances) {
            // increase to next multiple of 4096 above nAgents
            const newInstanceCount =
                (Math.trunc(requestedNumInstances / increment) + 1) * increment;
            console.log("realloc to " + newInstanceCount + " instances");

            this.reallocate(newInstanceCount);
        }

        this.isUpdating = true;
        this.currentInstance = 0;
    }

    addInstance(
        x: number,
        y: number,
        z: number,
        scale: number,
        qx: number,
        qy: number,
        qz: number,
        qw: number,
        instanceId: number,
        typeId: number,
        c: Color
    ): void {
        const offset = this.currentInstance;

        this.fallbackMesh.setMatrixAt(
            offset,
            new Matrix4().compose(
                new Vector3(x, y, z),
                new Quaternion(qx, qy, qz, qw),
                new Vector3(scale, scale, scale)
            )
        );
        this.fallbackMesh.setColorAt(offset, c);

        this.currentInstance++;
    }

    endUpdate(): void {
        this.updateInstanceCount(this.currentInstance);

        this.fallbackMesh.instanceMatrix.needsUpdate = true;

        this.isUpdating = false;
    }
}

export default InstancedFiberEndcapsFallback;
