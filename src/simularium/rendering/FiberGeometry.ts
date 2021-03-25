import {
    BufferAttribute,
    BufferGeometry,
    Curve,
    Float32BufferAttribute,
    Uint16BufferAttribute,
    Uint32BufferAttribute,
    Vector2,
    Vector3,
} from "three";

interface FiberGeometryParameters {
    path: Curve<Vector3>;
    tubularSegments: number;
    radius: number;
    radialSegments: number;
    closed: boolean;
}

// helper variables

const vertex = new Vector3();
const normal = new Vector3();
const uv = new Vector2();
let P = new Vector3();
let vbufferIndex = 0;
let nbufferIndex = 0;
let uvbufferIndex = 0;

class FiberGeometry extends BufferGeometry {
    private parameters: FiberGeometryParameters;
    private curvetangents: Vector3[];
    private curvenormals: Vector3[];
    private curvebinormals: Vector3[];
    private vertices: Float32Array;
    private normals: Float32Array;
    private uvs: Float32Array;
    private indices: BufferAttribute;

    constructor(
        path: Curve<Vector3>,
        tubularSegments = 64,
        radius = 1,
        radialSegments = 8,
        closed = false
    ) {
        super();
        this.type = "TubeGeometry";

        this.parameters = {
            path: path,
            tubularSegments: tubularSegments,
            radius: radius,
            radialSegments: radialSegments,
            closed: closed,
        };

        const frames = path.computeFrenetFrames(tubularSegments, closed);

        // curve data

        this.curvetangents = frames.tangents;
        this.curvenormals = frames.normals;
        this.curvebinormals = frames.binormals;

        // buffer init

        this.vertices = new Float32Array();
        this.normals = new Float32Array();
        this.uvs = new Float32Array();
        this.indices = new Uint16BufferAttribute(0, 1);

        // create buffer data / build geometry
        this.generateBufferData(false);

        this.attributes.position.needsUpdate = true;
        this.attributes.normal.needsUpdate = true;
        this.attributes.uv.needsUpdate = true;
    }

    toJSON(): string {
        const data = BufferGeometry.prototype.toJSON.call(this);

        data.path = this.parameters.path.toJSON();

        return data;
    }

    updateFromCurve(curve: Curve<Vector3>, radius: number): void {
        this.parameters.radius = radius;
        this.parameters.path = curve;

        const frames = curve.computeFrenetFrames(
            this.parameters.tubularSegments,
            this.parameters.closed
        );

        this.curvetangents = frames.tangents;
        this.curvenormals = frames.normals;
        this.curvebinormals = frames.binormals;

        this.generateBufferData(true);

        this.attributes.position.needsUpdate = true;
        this.attributes.normal.needsUpdate = true;
        this.attributes.uv.needsUpdate = true;
    }

    generateBufferData(fromUpdate: boolean): void {
        const nverts =
            (this.parameters.tubularSegments + 1) *
            (this.parameters.radialSegments + 1);

        if (nverts * 3 !== this.vertices.length) {
            if (fromUpdate) {
                console.log("update but num verts changed");
            }
            this.vertices = new Float32Array(nverts * 3);
            this.setAttribute(
                "position",
                new Float32BufferAttribute(this.vertices, 3)
            );
        }
        if (nverts * 3 !== this.normals.length) {
            this.normals = new Float32Array(nverts * 3);
            this.setAttribute(
                "normal",
                new Float32BufferAttribute(this.normals, 3)
            );
        }
        if (nverts * 2 !== this.uvs.length) {
            this.uvs = new Float32Array(nverts * 2);
            this.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2));
        }

        nbufferIndex = 0;
        vbufferIndex = 0;

        for (let i = 0; i < this.parameters.tubularSegments; i++) {
            this.generateSegment(i);
        }

        // if the geometry is not closed, generate the last row of vertices and normals
        // at the regular position on the given path
        //
        // if the geometry is closed, duplicate the first row of vertices and normals (uvs will differ)

        this.generateSegment(
            closed === false ? this.parameters.tubularSegments : 0
        );

        // uvs are generated in a separate function.
        // this makes it easy compute correct values for closed geometries

        this.generateUVs();

        // finally create faces
        this.generateIndices();
    }

    generateSegment(i: number): void {
        // we use getPointAt to sample evenly distributed points from the given path

        P = this.parameters.path.getPointAt(
            i / this.parameters.tubularSegments,
            P
        );

        // retrieve corresponding normal and binormal

        const N = this.curvenormals[i];
        const B = this.curvebinormals[i];

        // generate normals and vertices for the current segment

        for (let j = 0; j <= this.parameters.radialSegments; j++) {
            const v = (j / this.parameters.radialSegments) * Math.PI * 2;

            const sin = Math.sin(v);
            const cos = -Math.cos(v);

            // normal

            normal.x = cos * N.x + sin * B.x;
            normal.y = cos * N.y + sin * B.y;
            normal.z = cos * N.z + sin * B.z;
            normal.normalize();

            this.attributes.normal.setXYZ(
                nbufferIndex++,
                normal.x,
                normal.y,
                normal.z
            );

            // vertex

            vertex.x = P.x + this.parameters.radius * normal.x;
            vertex.y = P.y + this.parameters.radius * normal.y;
            vertex.z = P.z + this.parameters.radius * normal.z;

            this.attributes.position.setXYZ(
                vbufferIndex++,
                vertex.x,
                vertex.y,
                vertex.z
            );
        }
    }

    generateIndices(): void {
        // TODO optimize for reusing same buffer rather than always reallocating
        if (
            (this.parameters.tubularSegments + 1) *
                (this.parameters.radialSegments + 1) >
            65535
        ) {
            this.indices = new Uint32BufferAttribute(
                this.parameters.tubularSegments *
                    this.parameters.radialSegments *
                    6,
                1
            );
            this.setIndex(this.indices);
        } else {
            this.indices = new Uint16BufferAttribute(
                this.parameters.tubularSegments *
                    this.parameters.radialSegments *
                    6,
                1
            );
            this.setIndex(this.indices);
        }

        let indexBufferIndex = 0;
        for (let j = 1; j <= this.parameters.tubularSegments; j++) {
            for (let i = 1; i <= this.parameters.radialSegments; i++) {
                const a =
                    (this.parameters.radialSegments + 1) * (j - 1) + (i - 1);
                const b = (this.parameters.radialSegments + 1) * j + (i - 1);
                const c = (this.parameters.radialSegments + 1) * j + i;
                const d = (this.parameters.radialSegments + 1) * (j - 1) + i;

                // 2 triangle faces
                this.indices.setX(indexBufferIndex++, a);
                this.indices.setX(indexBufferIndex++, b);
                this.indices.setX(indexBufferIndex++, d);
                this.indices.setX(indexBufferIndex++, b);
                this.indices.setX(indexBufferIndex++, c);
                this.indices.setX(indexBufferIndex++, d);
            }
        }
        this.indices.needsUpdate = true;
    }

    generateUVs(): void {
        uvbufferIndex = 0;
        for (let i = 0; i <= this.parameters.tubularSegments; i++) {
            for (let j = 0; j <= this.parameters.radialSegments; j++) {
                uv.x = i / this.parameters.tubularSegments;
                uv.y = j / this.parameters.radialSegments;

                this.attributes.uv.setXY(uvbufferIndex++, uv.x, uv.y);
            }
        }
    }
}

export default FiberGeometry;
