import {
    SphereBufferGeometry,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    Mesh,
    Color,
} from "three";
import IInstancedFiberEndcaps from "./IInstancedFiberEndcaps";

class InstancedFiberEndcaps implements IInstancedFiberEndcaps {
    private endcapGeometry: SphereBufferGeometry;
    private mesh: Mesh;
    private instancedGeometry: InstancedBufferGeometry;
    private positionAttribute: InstancedBufferAttribute; // x,y,z,scale
    private rotationAttribute: InstancedBufferAttribute; // quaternion xyzw
    private instanceAttribute: InstancedBufferAttribute; // instance id, type id (color index)
    private currentInstance: number;
    private isUpdating: boolean;

    constructor() {
        this.mesh = new Mesh();
        this.instancedGeometry = new InstancedBufferGeometry();
        this.positionAttribute = new InstancedBufferAttribute(
            new Float32Array(),
            4,
            false
        );
        this.rotationAttribute = new InstancedBufferAttribute(
            new Float32Array(),
            4,
            false
        );
        this.instanceAttribute = new InstancedBufferAttribute(
            new Float32Array(),
            2,
            false
        );

        this.currentInstance = 0;
        this.isUpdating = false;
        this.endcapGeometry = new SphereBufferGeometry(1, 8, 8);
    }

    public create(n: number): void {
        this.reallocate(n);
        this.instancedGeometry.instanceCount = n;
        this.mesh = new Mesh(this.instancedGeometry);
        this.mesh.frustumCulled = false;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    private updateInstanceCount(n: number): void {
        //console.log("total draws = " + n);
        this.instancedGeometry.instanceCount = n;
    }

    private reallocate(n: number): void {
        // tell threejs/webgl that we can discard the old buffers
        this.instancedGeometry.dispose();

        // we must create a new Geometry to have things update correctly
        this.instancedGeometry = new InstancedBufferGeometry().copy(
            this.endcapGeometry
        );
        // install the new geometry into our Mesh object
        this.mesh.geometry = this.instancedGeometry;

        // make new array,
        // copy old array into it,
        // reset into instancedGeometry

        const newPos = new Float32Array(4 * n);
        newPos.set(this.positionAttribute.array);
        this.positionAttribute = new InstancedBufferAttribute(newPos, 4, false);
        this.instancedGeometry.setAttribute(
            "translateAndScale",
            this.positionAttribute
        );

        const newRot = new Float32Array(4 * n);
        newRot.set(this.rotationAttribute.array);
        this.rotationAttribute = new InstancedBufferAttribute(newRot, 4, false);
        this.instancedGeometry.setAttribute(
            "rotationQ",
            this.rotationAttribute
        );

        const newInst = new Float32Array(2 * n);
        newInst.set(this.instanceAttribute.array);
        this.instanceAttribute = new InstancedBufferAttribute(
            newInst,
            2,
            false
        );
        this.instancedGeometry.setAttribute(
            "instanceAndTypeId",
            this.instanceAttribute
        );
    }

    beginUpdate(nAgents: number): void {
        // do we need to increase storage?
        const increment = 4096;
        // total num instances possible in buffer
        const currentNumInstances = this.instanceAttribute.count;
        // num of instances needed
        const requestedNumInstances = nAgents * 2;

        if (requestedNumInstances > currentNumInstances) {
            // increase to next multiple of increment
            const newInstanceCount =
                (Math.trunc(requestedNumInstances / increment) + 1) * increment;

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
        c: Color // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void {
        const offset = this.currentInstance;
        this.positionAttribute.setXYZW(offset, x, y, z, scale);
        this.instanceAttribute.setXY(offset, instanceId, typeId);
        this.rotationAttribute.setXYZW(offset, qx, qy, qz, qw);

        this.currentInstance++;
    }

    endUpdate(): void {
        this.updateInstanceCount(this.currentInstance);

        // assumes the entire buffers are invalidated.
        this.instanceAttribute.needsUpdate = true;
        this.rotationAttribute.needsUpdate = true;
        this.positionAttribute.needsUpdate = true;
        this.isUpdating = false;
    }
}

export default InstancedFiberEndcaps;
