import {
    SphereBufferGeometry,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    Mesh,
} from "three";

class InstancedFiberEndcaps {
    private mesh: Mesh;
    private instancedGeometry: InstancedBufferGeometry;
    private positionArray: Float32Array; // x,y,z,scale
    private rotationArray: Float32Array; // quaternion xyzw
    private instanceArray: Float32Array; // instance id, type id (color index)
    private currentInstance: number;
    private isUpdating: boolean;

    constructor() {
        this.mesh = new Mesh();
        this.instancedGeometry = new InstancedBufferGeometry();
        this.positionArray = new Float32Array();
        this.instanceArray = new Float32Array();
        this.rotationArray = new Float32Array();
        this.currentInstance = 0;
        this.isUpdating = false;
    }

    public create(n: number): void {
        const baseGeometry = new SphereBufferGeometry(1, 8, 8);
        this.instancedGeometry = new InstancedBufferGeometry().copy(
            baseGeometry
        );
        const instanceCount = n;
        this.instancedGeometry.maxInstancedCount = instanceCount;
        //let material = new THREE.ShaderMaterial();
        this.mesh = new Mesh(this.instancedGeometry); //, material);
        this.mesh.frustumCulled = false;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    // send in new instance data
    updateInstanceBuffer(
        attributeName: string,
        data: Float32Array,
        nfloatsPerValue = 3
    ): void {
        this.instancedGeometry.setAttribute(
            attributeName,
            new InstancedBufferAttribute(data, nfloatsPerValue, false)
        );
    }

    private updateInstanceCount(n: number): void {
        this.instancedGeometry.maxInstancedCount = n;
    }

    beginUpdate(nAgents: number): void {
        // do we need to increase storage?
        const increment = 4096;
        // two instances per agent.
        if (nAgents * 2 > this.instanceArray.length / 2) {
            // increase to next multiple of 4096 above nAgents
            const newCount = (Math.trunc(nAgents / increment) + 1) * increment;
            console.log("realloc to " + newCount + " agents");

            const newPos = new Float32Array(4 * newCount);
            newPos.set(this.positionArray);
            this.positionArray = newPos;

            const newInst = new Float32Array(2 * newCount);
            newInst.set(this.positionArray);
            this.instanceArray = newInst;

            const newRot = new Float32Array(4 * newCount);
            newRot.set(this.rotationArray);
            this.rotationArray = newRot;
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
        typeId: number
    ): void {
        const offset = this.currentInstance;
        this.positionArray[offset * 4 + 0] = x;
        this.positionArray[offset * 4 + 1] = y;
        this.positionArray[offset * 4 + 2] = z;
        this.positionArray[offset * 4 + 3] = scale;
        this.instanceArray[offset * 2 + 0] = instanceId;
        this.instanceArray[offset * 2 + 1] = typeId;
        this.rotationArray[offset * 4 + 0] = qx;
        this.rotationArray[offset * 4 + 1] = qy;
        this.rotationArray[offset * 4 + 2] = qz;
        this.rotationArray[offset * 4 + 3] = qw;

        this.currentInstance++;
    }

    endUpdate(): void {
        // const pos = new Float32Array(
        //     this.positionArray.slice(0, this.currentInstance * 4)
        // );
        this.updateInstanceBuffer("translateAndScale", this.positionArray, 4);

        // const rot = new Float32Array(
        //     this.rotationArray.slice(0, this.currentInstance * 4)
        // );
        this.updateInstanceBuffer("rotationQ", this.rotationArray, 4);

        // const inst = new Float32Array(
        //     this.instanceArray.slice(0, this.currentInstance * 2)
        // );
        this.updateInstanceBuffer("instanceAndTypeId", this.instanceArray, 2);

        this.updateInstanceCount(this.currentInstance);

        this.isUpdating = false;
    }
}

export default InstancedFiberEndcaps;
