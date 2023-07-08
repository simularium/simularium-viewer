import {
    Color,
    BufferAttribute,
    BufferGeometry,
    LineBasicMaterial,
    LineSegments,
} from "three";

const MAX_PATH_LENGTH = 32;

function lerp(x0: number, x1: number, alpha: number): number {
    return x0 + (x1 - x0) * alpha;
}

export default class LinePath {
    numSegments: number;
    maxSegments: number;
    color: Color;
    points: Float32Array;
    colors: Float32Array;
    geometry: BufferGeometry;
    material: LineBasicMaterial;
    line: LineSegments;

    constructor(color?: Color, maxSegments: number = MAX_PATH_LENGTH) {
        const pointsArray = new Float32Array(maxSegments * 3 * 2);
        const colorsArray = new Float32Array(maxSegments * 3 * 2);
        const lineGeometry = new BufferGeometry();
        lineGeometry.setAttribute(
            "position",
            new BufferAttribute(pointsArray, 3)
        );
        lineGeometry.setAttribute("color", new BufferAttribute(colorsArray, 3));
        // path starts empty: draw range spans nothing
        lineGeometry.setDrawRange(0, 0);

        // the line will be colored per-vertex
        const lineMaterial = new LineBasicMaterial({
            vertexColors: true,
        });

        const lineObject = new LineSegments(lineGeometry, lineMaterial);
        lineObject.frustumCulled = false;

        this.numSegments = 0;
        this.maxSegments = maxSegments;
        this.color = color || new Color(0xffffff);
        this.points = pointsArray;
        this.colors = colorsArray;
        this.geometry = lineGeometry;
        this.material = lineMaterial;
        this.line = lineObject;
    }

    public show(visible: boolean): void {
        this.line.visible = visible;
    }

    public addPointToPath(
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number,
        pathEndColor: Color
    ): void {
        // check for paths at max length
        if (this.numSegments === this.maxSegments) {
            // because we append to the end, we can copyWithin to move points up to the beginning
            // as a means of removing the first point in the path.
            // shift the points:
            this.points.copyWithin(0, 3 * 2, this.maxSegments * 3 * 2);
            this.numSegments = this.maxSegments - 1;
        } else {
            // rewrite all the colors. this might be prohibitive for lots of long paths.
            for (let ic = 0; ic < this.numSegments + 1; ++ic) {
                // the very first point should be a=1
                const a = 1.0 - ic / (this.numSegments + 1);
                this.colors[ic * 6 + 0] = lerp(this.color.r, pathEndColor.r, a);
                this.colors[ic * 6 + 1] = lerp(this.color.g, pathEndColor.g, a);
                this.colors[ic * 6 + 2] = lerp(this.color.b, pathEndColor.b, a);

                // the very last point should be b=0
                const b = 1.0 - (ic + 1) / (this.numSegments + 1);
                this.colors[ic * 6 + 3] = lerp(this.color.r, pathEndColor.r, b);
                this.colors[ic * 6 + 4] = lerp(this.color.g, pathEndColor.g, b);
                this.colors[ic * 6 + 5] = lerp(this.color.b, pathEndColor.b, b);
            }
            this.line.geometry.getAttribute("color").needsUpdate = true;
        }
        // add a segment to this line
        this.points[this.numSegments * 2 * 3 + 0] = x - dx;
        this.points[this.numSegments * 2 * 3 + 1] = y - dy;
        this.points[this.numSegments * 2 * 3 + 2] = z - dz;
        this.points[this.numSegments * 2 * 3 + 3] = x;
        this.points[this.numSegments * 2 * 3 + 4] = y;
        this.points[this.numSegments * 2 * 3 + 5] = z;

        this.numSegments++;

        this.line.geometry.setDrawRange(0, this.numSegments * 2);
        this.line.geometry.getAttribute("position").needsUpdate = true; // required after the first render
    }
}
