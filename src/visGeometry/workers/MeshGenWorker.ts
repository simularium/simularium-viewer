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

        /////////////////////////////////////////////////////////////////////
        // NOTES
        /////////////////////////////////////////////////////////////////////
        // we want to generate the "shell mesh" of all these spheres
        // TODO
        // 1. add an implementation that generates a metaball mesh
        // 2. try to test the three-bvh-csg library (was having incompatibility probs with threejs versions)
        // 3. find some other algo to do quick mesh gen from point cloud (where the points have radii).

        // ignoring performance.  we want to see transparent single objects with as little overdraw/overblending as possible

        // TODO unrelated to this code.
        // 1. brute force render one object at a time to buffer, only keep frontmost pixels
        // 2. blend onto the composite buffer
        // 3. clear intermediate buffer and go to step 1

        // TODO "stochastic transparency"
        // on the premise that some kind of random sampling of alphas combined with a max/min blending op
        // and maybe using a temp intermediate buffer (?)
        // will give a good approximation of the transparency we want

        // render all xparent into buffer with depth testing so you get the frontmost pixels only of transparents
        // but also depth tested against the opaque objects (because they were already rendered into the depth buffer first)
        // two options: render object ids into that buffer and then blend in a composite that does color+alpha lookup.
        // OR render color and alpha directly without blending, and then blend directly into the main buffer
        /////////////////////////////////////////////////////////////////////
        // END NOTES
        /////////////////////////////////////////////////////////////////////

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
