import {
    loadVtkPolyData,
    parseVtkPolyData,
} from "../visGeometry/VtkPolyDataLoader.js";

const readMeshMock = vi.hoisted(() =>
    vi.fn(async (file: { data: Uint8Array }) => {
        const isQuad = new TextDecoder().decode(file.data).includes("quad");
        return {
            mesh: {
                numberOfPoints: isQuad ? 4 : 3,
                numberOfCells: 1,
                points: isQuad
                    ? new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0])
                    : new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                cells: isQuad
                    ? new Uint32Array([4, 4, 0, 1, 2, 3])
                    : new Uint32Array([4, 3, 0, 1, 2]),
            },
            webWorker: { terminate: vi.fn() },
        };
    })
);

vi.mock("@itk-wasm/mesh-io", () => ({
    setPipelineWorkerUrl: vi.fn(),
    setPipelinesBaseUrl: vi.fn(),
    readMesh: readMeshMock,
}));

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

const TRIANGLE_VTK_5_1 = `# vtk DataFile Version 5.1
triangle
ASCII
DATASET POLYDATA
POINTS 3 float
0 0 0  1 0 0  0 1 0
POLYGONS 2 3
OFFSETS vtktypeint64
0 3
CONNECTIVITY vtktypeint64
0 1 2
`;

describe("VtkPolyDataLoader", () => {
    test("converts VTK POLYDATA into Three.js geometry", async () => {
        const geometry = await parseVtkPolyData(TRIANGLE_VTK);

        expect(geometry.getAttribute("position").count).toBe(3);
        expect(geometry.getAttribute("normal").count).toBe(3);
    });

    test("triangulates polygonal cells with vtk.js", async () => {
        const geometry = await parseVtkPolyData(QUAD_VTK);

        expect(geometry.getAttribute("position").count).toBe(6);
    });

    test("reads VTK 5.1 offset and connectivity arrays", async () => {
        const geometry = await parseVtkPolyData(TRIANGLE_VTK_5_1);

        expect(geometry.getAttribute("position").count).toBe(3);
        expect(geometry.getAttribute("normal").count).toBe(3);
    });

    test("uses a basename for ITK's in-memory file path", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                Promise.resolve(
                    new Response(new TextEncoder().encode(TRIANGLE_VTK), {
                        status: 200,
                    })
                )
            )
        );

        await loadVtkPolyData(
            "https://example.test/mesh-series/sample(1)_019/inner_surface.vtk"
        );

        expect(readMeshMock).toHaveBeenLastCalledWith(
            expect.objectContaining({ path: "inner_surface.vtk" })
        );
        vi.unstubAllGlobals();
    });

    test("rejects datasets that are not POLYDATA", async () => {
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

        await expect(parseVtkPolyData(structuredPoints)).rejects.toThrow(
            "VTK file does not contain a POLYDATA dataset"
        );
    });
});
