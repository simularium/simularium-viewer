import {
    BufferAttribute,
    BufferGeometry,
    CylinderGeometry,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    Mesh,
    Color,
    DataTexture,
    RGBFormat,
    FloatType,
    Vector2,
    Vector3,
} from "three";

function createTubeGeometry(
    numSides = 8,
    subdivisions = 50,
    openEnded = false
) {
    // create a base CylinderGeometry which handles UVs, end caps and faces
    const radius = 1;
    const length = 1;
    const baseGeometry = new CylinderGeometry(
        radius,
        radius,
        length,
        numSides,
        subdivisions,
        openEnded
    );

    // fix the orientation so X can act as arc length
    baseGeometry.rotateZ(Math.PI / 2);

    // compute the radial angle for each position for later extrusion
    const tmpVec = new Vector2();
    const xPositions: number[] = [];
    const angles: number[] = [];
    const uvs: Array<Array<number>> = [];
    const vertices = baseGeometry.attributes.position.array;
    const faceVertexUvs = baseGeometry.attributes.uv.array;
    // assume index is not null
    const indices = (baseGeometry.index as BufferAttribute).array;
    //  const faceVertexUvs = baseGeometry.faceVertexUvs[0];

    // Now go through each face and un-index the geometry.
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];
        const v0 = new Vector3(
            vertices[a * 3 + 0],
            vertices[a * 3 + 1],
            vertices[a * 3 + 2]
        );
        const v1 = new Vector3(
            vertices[b * 3 + 0],
            vertices[b * 3 + 1],
            vertices[b * 3 + 2]
        );
        const v2 = new Vector3(
            vertices[c * 3 + 0],
            vertices[c * 3 + 1],
            vertices[c * 3 + 2]
        );
        const verts = [v0, v1, v2];
        const faceUvs = [
            new Vector2(faceVertexUvs[a * 2 + 0], faceVertexUvs[a * 2 + 1]),
            new Vector2(faceVertexUvs[b * 2 + 0], faceVertexUvs[b * 2 + 1]),
            new Vector2(faceVertexUvs[c * 2 + 0], faceVertexUvs[c * 2 + 1]),
        ]; //faceVertexUvs[i];

        // For each vertex in this face...
        verts.forEach((v, j) => {
            tmpVec.set(v.y, v.z).normalize();

            // the radial angle around the tube
            const angle = Math.atan2(tmpVec.y, tmpVec.x);
            angles.push(angle);

            // "arc length" in range [-0.5 .. 0.5]
            xPositions.push(v.x);

            // copy over the UV for this vertex
            uvs.push(faceUvs[j].toArray());
        });
    }

    // build typed arrays for our attributes
    const posArray = new Float32Array(xPositions);
    const angleArray = new Float32Array(angles);
    const uvArray = new Float32Array(uvs.length * 2);

    // unroll UVs
    for (let i = 0; i < posArray.length; i++) {
        const [u, v] = uvs[i];
        uvArray[i * 2 + 0] = u;
        uvArray[i * 2 + 1] = v;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(posArray, 1));
    geometry.setAttribute("angle", new BufferAttribute(angleArray, 1));
    geometry.setAttribute("uv", new BufferAttribute(uvArray, 2));

    // dispose old geometry since we no longer need it
    baseGeometry.dispose();
    return geometry;
}

class InstancedFiber {
    // number of control points per curve instance
    private nCurvePoints: number;
    private curveGeometry: BufferGeometry;
    private mesh: Mesh;
    private instancedGeometry: InstancedBufferGeometry;

    private positionAttribute: InstancedBufferAttribute; // x,y,z,scale
    private instanceAttribute: InstancedBufferAttribute; // instance id, type id (color index)

    // holds control points for all the curves
    private curveData: DataTexture;

    // while updating instances
    private currentInstance: number;
    private isUpdating: boolean;

    constructor() {
        this.nCurvePoints = 0;
        this.mesh = new Mesh();
        this.instancedGeometry = new InstancedBufferGeometry();
        this.positionAttribute = new InstancedBufferAttribute(
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
        this.curveGeometry = new BufferGeometry();
        this.curveData = new DataTexture(Uint8Array.from([]), 0, 0);
    }

    // n is number of instances
    // nPoints is number of curve control points
    // nSegments is number of curve segments
    // nRadialSections is number of radial sections (how many points in the polygonal cross section)
    public create(
        n: number,
        nPoints: number,
        nSegments: number,
        nRadialSections: number
    ): void {
        this.nCurvePoints = nPoints;

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
        this.curveData.dispose();

        // build new data texture
        this.curveData = new DataTexture(
            new Float32Array(n * this.nCurvePoints * 3),
            this.nCurvePoints,
            n,
            RGBFormat,
            FloatType
        );

        // we must create a new Geometry to have things update correctly
        this.instancedGeometry = new InstancedBufferGeometry().copy(
            this.curveGeometry
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

        this.currentInstance++;
    }

    endUpdate(): void {
        this.updateInstanceCount(this.currentInstance);

        // assumes the entire buffers are invalidated.
        this.instanceAttribute.needsUpdate = true;
        this.positionAttribute.needsUpdate = true;
        this.isUpdating = false;
    }
}

export default InstancedFiber;
