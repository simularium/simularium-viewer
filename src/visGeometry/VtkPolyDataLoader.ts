import vtkPolyDataFactory from "@kitware/vtk.js/Common/DataModel/PolyData.js";
import type { vtkPolyData } from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkTriangleFilter from "@kitware/vtk.js/Filters/General/TriangleFilter.js";
import {
    readMesh,
    setPipelineWorkerUrl,
    setPipelinesBaseUrl,
} from "@itk-wasm/mesh-io";
import type { BinaryFile, Mesh as ItkMesh } from "itk-wasm";
import { BufferGeometry, Float32BufferAttribute } from "three";

type ProgressCallback = (loaded: number, total: number) => void;

// ITK-Wasm otherwise fetches its parser pipeline from jsDelivr after the mesh
// download has completed. Applications serving Simularium Viewer copy these
// fixed-name assets to this location so parsing also works on restricted
// networks.
if (typeof window !== "undefined") {
    const itkAssetsUrl = new URL("/itk-pipelines/", window.location.origin);
    setPipelinesBaseUrl(itkAssetsUrl);
    // Supplying an explicit worker avoids Vite rewriting ITK's default
    // new URL(..., import.meta.url) expression to a generated dependency URL
    // that never resolves in development mode.
    setPipelineWorkerUrl(new URL("itk-wasm-pipeline.worker.js", itkAssetsUrl));
}

// itk::CommonEnums::CellGeometry values that represent polygonal surface cells.
const POLYGON_CELL_TYPES = new Set([2, 3, 4]);

// A trajectory can reference a different VTK file for every frame. Starting
// one ITK-Wasm worker (and compiling the same pipeline) for every URL at once
// can exhaust browser worker/memory limits before any parse completes.
let vtkParseQueue: Promise<void> = Promise.resolve();

const polyDataToBufferGeometry = (polyData: vtkPolyData): BufferGeometry => {
    // VTK polygons may have any number of vertices. Use vtk.js's triangulator
    // so concave polygons are handled correctly before creating Three geometry.
    const triangleFilter = vtkTriangleFilter.newInstance();
    triangleFilter.setInputData(polyData);
    triangleFilter.update();

    const triangulated = triangleFilter.getOutputData() as vtkPolyData;
    const points = triangulated.getPoints().getData();
    if (!points?.length) {
        throw new Error("VTK POLYDATA does not contain polygonal cells");
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array(points), 3)
    );
    geometry.computeVertexNormals();
    return geometry;
};

const itkMeshToVtkPolyData = (mesh: ItkMesh): vtkPolyData => {
    if (!mesh.points?.length || !mesh.cells?.length) {
        throw new Error("VTK POLYDATA does not contain polygonal cells");
    }

    const polygons: number[] = [];
    let offset = 0;
    let cellCount = 0;
    while (offset < mesh.cells.length) {
        const cellType = Number(mesh.cells[offset++]);
        const pointCount = Number(mesh.cells[offset++]);
        if (
            !Number.isSafeInteger(pointCount) ||
            pointCount < 0 ||
            offset + pointCount > mesh.cells.length
        ) {
            throw new Error("VTK POLYDATA contains invalid cell connectivity");
        }
        if (POLYGON_CELL_TYPES.has(cellType)) {
            polygons.push(pointCount);
            for (let index = 0; index < pointCount; index += 1) {
                polygons.push(Number(mesh.cells[offset + index]));
            }
        }
        offset += pointCount;
        cellCount += 1;
    }
    if (cellCount !== mesh.numberOfCells || polygons.length === 0) {
        throw new Error("VTK POLYDATA does not contain polygonal cells");
    }

    const vtkData = vtkPolyDataFactory.newInstance();
    vtkData
        .getPoints()
        .setData(Float32Array.from(mesh.points as ArrayLike<number>), 3);
    vtkData.getPolys().setData(Uint32Array.from(polygons));
    return vtkData;
};

const readVtkMeshNow = async (file: BinaryFile): Promise<BufferGeometry> => {
    let worker: Worker | undefined;
    try {
        console.info(
            `[geometry-store] Starting ITK-Wasm VTK parse: ${file.path}`
        );
        const readResult = await readMesh(file);
        worker = readResult.webWorker;
        const geometry = polyDataToBufferGeometry(
            itkMeshToVtkPolyData(readResult.mesh)
        );
        console.info(
            `[geometry-store] Finished ITK-Wasm VTK parse: ${file.path} ` +
                `(${geometry.getAttribute("position").count} vertices)`
        );
        return geometry;
    } finally {
        worker?.terminate();
    }
};

const readVtkMesh = (file: BinaryFile): Promise<BufferGeometry> => {
    const result = vtkParseQueue.then(() => readVtkMeshNow(file));
    // Keep the queue usable after an individual file fails.
    vtkParseQueue = result.then(
        () => undefined,
        () => undefined
    );
    return result;
};

const fetchBinaryFile = async (
    url: string,
    onProgress?: ProgressCallback
): Promise<BinaryFile> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to load VTK mesh: ${response.status} ${response.statusText}`
        );
    }

    const total = Number(response.headers.get("content-length")) || 0;
    // ITK writes BinaryFile.path into Emscripten's in-memory filesystem.
    // Passing the complete URL makes it look like a nested local path whose
    // directories do not exist (ErrnoError 44 / ENOENT). It only needs a
    // basename with the correct extension to select the VTK reader.
    const pathname = new URL(url, window.location.href).pathname;
    const fileName = pathname.substring(pathname.lastIndexOf("/") + 1);
    const virtualFilePath = fileName || "mesh.vtk";
    const reader = response.body?.getReader();
    if (!reader) {
        const data = new Uint8Array(await response.arrayBuffer());
        onProgress?.(data.byteLength, total || data.byteLength);
        return { path: virtualFilePath, data };
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
        loaded += value.byteLength;
        onProgress?.(loaded, total);
    }

    const data = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return { path: virtualFilePath, data };
};

export const parseVtkPolyData = async (
    content: string
): Promise<BufferGeometry> => {
    if (!/^\s*DATASET\s+POLYDATA\s*$/im.test(content)) {
        throw new Error("VTK file does not contain a POLYDATA dataset");
    }
    return readVtkMesh({
        path: "mesh.vtk",
        data: new TextEncoder().encode(content),
    });
};

export const loadVtkPolyData = async (
    url: string,
    onProgress?: ProgressCallback
): Promise<BufferGeometry> => {
    return readVtkMesh(await fetchBinaryFile(url, onProgress));
};
