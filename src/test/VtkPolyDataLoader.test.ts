import { parseVtkPolyData } from "../visGeometry/VtkPolyDataLoader.js";

const TRIANGLE_VTK = `# vtk DataFile Version 3.0
triangle
ASCII
DATASET POLYDATA
POINTS 3 float
0 0 0  1 0 0  0 1 0
POLYGONS 1 4
3 0 1 2
`;

const QUAD_VTK = `# vtk DataFile Version 3.0
quad
ASCII
DATASET POLYDATA
POINTS 4 float
0 0 0  1 0 0  1 1 0  0 1 0
POLYGONS 1 5
4 0 1 2 3
`;

describe("VtkPolyDataLoader", () => {
    test("converts VTK POLYDATA into Three.js geometry", () => {
        const geometry = parseVtkPolyData(TRIANGLE_VTK);

        expect(geometry.getAttribute("position").count).toBe(3);
        expect(geometry.getAttribute("normal").count).toBe(3);
    });

    test("triangulates polygonal cells with vtk.js", () => {
        const geometry = parseVtkPolyData(QUAD_VTK);

        expect(geometry.getAttribute("position").count).toBe(6);
    });

    test("rejects datasets that are not POLYDATA", () => {
        const structuredPoints = `# vtk DataFile Version 3.0
volume
ASCII
DATASET STRUCTURED_POINTS
DIMENSIONS 1 1 1
ORIGIN 0 0 0
SPACING 1 1 1
POINT_DATA 1
SCALARS values float
LOOKUP_TABLE default
0
`;

        expect(() => parseVtkPolyData(structuredPoints)).toThrow(
            "VTK file does not contain a POLYDATA dataset"
        );
    });
});
