import {
    BufferGeometry,
    Curve,
    Float32BufferAttribute,
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

class FiberGeometry extends BufferGeometry {
    private parameters: FiberGeometryParameters;
    private curvetangents: Vector3[];
    private curvenormals: Vector3[];
    private curvebinormals: Vector3[];
    private vertices: Float32Array;
    private normals: Float32Array;
    private uvs: Float32Array;
    private indices: number[] = [];

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

        // expose internals

        this.curvetangents = frames.tangents;
        this.curvenormals = frames.normals;
        this.curvebinormals = frames.binormals;

        // buffer

        this.vertices = [];
        this.normals = [];
        this.uvs = [];
        this.indices = [];

        // create buffer data

        this.generateBufferData();

        // build geometry

        this.setIndex(this.indices);
        this.setAttribute(
            "position",
            new Float32BufferAttribute(this.vertices, 3)
        );
        this.setAttribute(
            "normal",
            new Float32BufferAttribute(this.normals, 3)
        );
        this.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2));

        // functions
    }
    toJSON(): string {
        const data = BufferGeometry.prototype.toJSON.call(this);

        data.path = this.parameters.path.toJSON();

        return data;
    }

    updateFromCurve(curve: Curve<Vector3>): void {
        this.parameters.path = curve;
    }

    generateBufferData(): void {
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

            this.normals.push(normal.x, normal.y, normal.z);

            // vertex

            vertex.x = P.x + this.parameters.radius * normal.x;
            vertex.y = P.y + this.parameters.radius * normal.y;
            vertex.z = P.z + this.parameters.radius * normal.z;

            this.vertices.push(vertex.x, vertex.y, vertex.z);
        }
    }

    generateIndices(): void {
        for (let j = 1; j <= this.parameters.tubularSegments; j++) {
            for (let i = 1; i <= this.parameters.radialSegments; i++) {
                const a =
                    (this.parameters.radialSegments + 1) * (j - 1) + (i - 1);
                const b = (this.parameters.radialSegments + 1) * j + (i - 1);
                const c = (this.parameters.radialSegments + 1) * j + i;
                const d = (this.parameters.radialSegments + 1) * (j - 1) + i;

                // faces

                this.indices.push(a, b, d);
                this.indices.push(b, c, d);
            }
        }
    }

    generateUVs(): void {
        for (let i = 0; i <= this.parameters.tubularSegments; i++) {
            for (let j = 0; j <= this.parameters.radialSegments; j++) {
                uv.x = i / this.parameters.tubularSegments;
                uv.y = j / this.parameters.radialSegments;

                this.uvs.push(uv.x, uv.y);
            }
        }
    }
}

export default FiberGeometry;
