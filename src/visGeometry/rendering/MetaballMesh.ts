import {
    Box3,
    Color,
    Euler,
    Group,
    Mesh,
    Quaternion,
    Vector3,
    Vector4,
} from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes";

import MetaballMeshShaders from "./MetaballMeshShader";
import { MRTShaders } from "./MultipassMaterials";

class MetaballMesh {
    private drawable: Group;
    private shaderSet: MRTShaders;

    // to act like an instancedmesh for GeometryStore purposes
    // but each instance is a whole MarchingCubes object
    constructor(name: string) {
        this.drawable = new Group();
        this.drawable.name = name;
        this.shaderSet = MetaballMeshShaders.shaderSet;
    }

    public getMesh(): Group {
        return this.drawable;
    }

    public getShaders(): MRTShaders {
        return this.shaderSet;
    }

    public instanceCount(): number {
        return this.drawable.children.length;
    }

    public beginUpdate(): void {
        // remove all from group!
        for (let i = this.drawable.children.length - 1; i >= 0; i--) {
            this.drawable.remove(this.drawable.children[i]);
        }
    }

    public endUpdate(): void {
        // no op
    }

    public replaceGeometry(newGeom: Mesh, meshName: string): void {
        // no op
    }

    public addInstance(
        x: number,
        y: number,
        z: number,
        scale: number,
        rx: number,
        ry: number,
        rz: number,
        uniqueAgentId: number,
        typeId: number,
        lodScale = 1,
        subPoints: number[] = []
    ): Mesh {
        // MARCHING CUBES

        const mat = this.shaderSet.mat.clone();
        mat.uniforms.translateAndScale.value = new Vector4(x, y, z, scale);
        mat.uniforms.rotation.value = new Quaternion().setFromEuler(
            new Euler(rx, ry, rz)
        );
        mat.uniforms.instanceAndTypeId.value = new Vector3(
            uniqueAgentId,
            typeId,
            lodScale
        );

        // what is a good value here?
        const resolution = 28;
        const enableNormals = true;
        const enableColors = false;
        const enableUvs = false;
        // buffer will be this size * 3 floats (?)
        // maybe can figure this out from number of balls
        const maxPolyCount = 65535;
        const effect = new MarchingCubes(
            resolution,
            mat,
            enableNormals,
            enableColors,
            maxPolyCount
        );
        effect.position.set(0, 0, 0);
        effect.scale.set(1, 1, 1);

        effect.enableUvs = enableUvs;
        effect.enableColors = enableColors;

        const bound = new Box3();
        let maxRadius = 0;
        for (let i = 0; i < subPoints.length; i += 4) {
            bound.expandByPoint(
                new Vector3(subPoints[i], subPoints[i + 1], subPoints[i + 2])
            );
            if (subPoints[i + 3] > maxRadius) {
                maxRadius = subPoints[i + 3];
            }
        }
        bound.expandByScalar(maxRadius);
        // now we have bounds and we can normalize the coordinates to size of box
        const boundSize = new Vector3();
        bound.getSize(boundSize);
        const maxSize = Math.max(boundSize.x, boundSize.y, boundSize.z);
        const center = new Vector3();
        bound.getCenter(center);

        for (let i = 0; i < subPoints.length; i += 4) {
            // radius = sqrt(strenght/subtract)
            const strength = subPoints[i + 3];
            const subtract = 1.0;

            // xyz must be 0..1 coordinates within the volume of the metaballs object.
            // therefore we need to take the object space coordinates and radii,
            // figure out max bounds, and compute relative positioning.
            // TODO allow space around axes that are not the longest
            const x = (subPoints[i + 0] - bound.min.x) / boundSize.x;
            const y = (subPoints[i + 1] - bound.min.y) / boundSize.y;
            const z = (subPoints[i + 2] - bound.min.z) / boundSize.z;
            // could put bounds in subpoints to preprocess?
            // metaball volume resolution will be a uniform resolution^3 grid
            // so the grid will not be tightly fit to the bounds if the bounds are not a cube
            effect.addBall(x, y, z, strength, subtract);
        }
        this.drawable.add(effect);

        return effect;
    }
}

export { MetaballMesh };
