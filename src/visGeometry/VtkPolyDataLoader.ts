import vtkTriangleFilter from "@kitware/vtk.js/Filters/General/TriangleFilter.js";
import type { vtkPolyData } from "@kitware/vtk.js/Common/DataModel/PolyData";
// vtk.js includes this reader in its published package, but currently omits its
// TypeScript declaration.
import vtkPolyDataReader from "@kitware/vtk.js/IO/Legacy/PolyDataReader.js";
import { BufferGeometry, Float32BufferAttribute } from "three";

interface ProgressEvent {
    lengthComputable: boolean;
    loaded: number;
    total: number;
}

interface PolyDataReader {
    getOutputData(): vtkPolyData | null;
    parseAsText(content: string): void;
    setUrl(
        url: string,
        options?: { progressCallback?: (event: ProgressEvent) => void }
    ): Promise<unknown>;
}

type ProgressCallback = (loaded: number, total: number) => void;

const getPolyData = (reader: PolyDataReader): vtkPolyData => {
    const polyData = reader.getOutputData();
    if (!polyData || !polyData.isA("vtkPolyData")) {
        throw new Error("VTK file does not contain a POLYDATA dataset");
    }
    return polyData;
};

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

export const parseVtkPolyData = (content: string): BufferGeometry => {
    if (!/^\s*DATASET\s+POLYDATA\s*$/im.test(content)) {
        throw new Error("VTK file does not contain a POLYDATA dataset");
    }
    const reader = vtkPolyDataReader.newInstance() as PolyDataReader;
    reader.parseAsText(content);
    return polyDataToBufferGeometry(getPolyData(reader));
};

export const loadVtkPolyData = async (
    url: string,
    onProgress?: ProgressCallback
): Promise<BufferGeometry> => {
    const reader = vtkPolyDataReader.newInstance() as PolyDataReader;
    await reader.setUrl(url, {
        progressCallback: onProgress
            ? (event) => onProgress(event.loaded, event.total)
            : undefined,
    });
    return polyDataToBufferGeometry(getPolyData(reader));
};
