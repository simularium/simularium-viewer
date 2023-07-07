import "regenerator-runtime/runtime";
import * as Comlink from "comlink";

import { Mesh, SphereGeometry } from "three";
import { CSG } from "three-csg-ts";

class MeshGenWorker {
    async run(data: Float32Array) {
        // for each 3d pt in data,
        // make a sphere mesh
        // pass the sphere mesh to consecutive CSG union operations
        // return the final mesh

        let result: Mesh = new Mesh(new SphereGeometry(1, 8, 8));
        result.position.set(data[0], data[1], data[2]);
        result.updateMatrix();

        for (let i = 1; i < data.length / 3; ++i) {
            const sphere = new Mesh(new SphereGeometry(1, 8, 8));
            sphere.position.set(data[3 * i], data[3 * i + 1], data[3 * i + 2]);
            sphere.updateMatrix();

            // Perform CSG operations
            result = CSG.union(result, sphere);
            console.log(
                "worker processed point " + i + " of " + data.length / 3
            );
        }
        const geo = result.geometry;
        const retval = {
            position: geo.attributes.position.array as Float32Array,
            normal: geo.attributes.normal.array as Float32Array,
            uv: geo.attributes.uv.array as Float32Array,
        };
        return Comlink.transfer(retval, [
            (retval.position as Float32Array).buffer,
            (retval.normal as Float32Array).buffer,
            (retval.uv as Float32Array).buffer,
        ]);
        // The result is a BufferGeometry
    }
}

export type MeshGenWorkerType = typeof MeshGenWorker;

Comlink.expose(MeshGenWorker);
