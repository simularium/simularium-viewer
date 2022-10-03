import { Color, BufferGeometry, LineBasicMaterial, LineSegments } from "three";
export default class LinePath {
    numSegments: number;
    maxSegments: number;
    color: Color;
    points: Float32Array;
    colors: Float32Array;
    geometry: BufferGeometry;
    material: LineBasicMaterial;
    line: LineSegments;
    constructor(color?: Color, maxSegments?: number);
    show(visible: boolean): void;
    addPointToPath(x: number, y: number, z: number, dx: number, dy: number, dz: number, pathEndColor: Color): void;
}
