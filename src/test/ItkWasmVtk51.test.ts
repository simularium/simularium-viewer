import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMeshNode } from "@itk-wasm/mesh-io";

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

describe("ITK-Wasm VTK 5.1 integration", () => {
    test("reads offset and connectivity cell arrays", async () => {
        const directory = await mkdtemp(join(tmpdir(), "itk-vtk-5-1-"));
        const meshPath = join(directory, "triangle.vtk");
        try {
            await writeFile(meshPath, TRIANGLE_VTK_5_1);
            const mesh = await readMeshNode(meshPath);

            expect(mesh.numberOfPoints).toBe(3);
            expect(mesh.numberOfCells).toBe(1);
            expect(mesh.cells).toEqual(new Uint32Array([4, 3, 0, 1, 2]));
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
});
