import {
    SphereBufferGeometry,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    Mesh,
} from "three";

class InstancedFiberEndcaps {
    private mesh: Mesh;
    private instancedGeometry: InstancedBufferGeometry;
    // private positionArray: number[];
    // private instanceArray: number[];

    constructor() {
        this.mesh = new Mesh();
        this.instancedGeometry = new InstancedBufferGeometry();
        // this.positionArray = [];
        // this.instanceArray = [];
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

    updateInstanceCount(n: number): void {
        this.instancedGeometry.maxInstancedCount = n;
    }
}

export default InstancedFiberEndcaps;
