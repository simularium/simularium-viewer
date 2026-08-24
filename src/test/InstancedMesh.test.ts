import { BoxGeometry, SphereGeometry } from "three";

import {
    InstanceType,
    InstancedMesh,
} from "../visGeometry/rendering/InstancedMesh.js";

describe("InstancedMesh", () => {
    test("preserves active instances when geometry loads asynchronously", () => {
        const instances = new InstancedMesh(
            InstanceType.MESH,
            new SphereGeometry(1),
            "placeholder",
            1
        );
        instances.beginUpdate();
        instances.addInstance(-258, -189, -56, 1, 0, 0, 0, 10, -1);
        instances.endUpdate();

        expect(instances.instanceCount()).toBe(1);

        const replacement = new BoxGeometry(2, 2, 2);
        instances.replaceGeometry(replacement, "loaded-mesh.vtk");

        expect(instances.instanceCount()).toBe(1);
        expect(
            instances.getMesh().geometry.getAttribute("position").count
        ).toBe(replacement.getAttribute("position").count);
        expect(
            Array.from(
                instances
                    .getMesh()
                    .geometry.getAttribute("translateAndScale")
                    .array.slice(0, 4)
            )
        ).toEqual([-258, -189, -56, 1]);
    });
});
